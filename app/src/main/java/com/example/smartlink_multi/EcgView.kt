package com.example.smartlink_multi

/**
 * EcgView.kt — SmartLink Multi
 *
 * Custom Android View that renders the ECG waveform in real time.
 *
 * Design approach:
 *   - Uses a fixed-size circular buffer (ring buffer) of 500 float values.
 *     New samples overwrite the oldest ones, so the waveform always shows
 *     the last 500 ADC readings — equivalent to ~2 seconds at 250 Hz.
 *   - On each addSamples() call, invalidate() is triggered which schedules
 *     a redraw via onDraw() on the next frame.
 *   - The Y axis is auto-scaled per frame based on the current min/max
 *     values in the buffer, with a minimum range of 50 ADC units to
 *     prevent wild scaling on flat signals.
 *
 * Performance notes:
 *   - Paint and Path objects are allocated once (class-level) and reused
 *     each frame to avoid triggering the GC during rendering.
 *   - Drawing is a single Path with WINDOW_SIZE-1 lineTo() calls —
 *     fast enough for 60fps on any modern Android device.
 *
 * Integration:
 *   EcgFragment observes BleViewModel.ecgSamples and calls addSamples()
 *   on each new BLE packet. clearData() is called on disconnect.
 */

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.util.AttributeSet
import android.view.View

class EcgView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyle: Int = 0
) : View(context, attrs, defStyle) {

    companion object {
        // Number of ADC samples held in the ring buffer at any time.
        // At 250 Hz this is ~2 seconds of signal history.
        // Increase for a longer window; decrease to reduce CPU load on draw.
        private const val WINDOW_SIZE = 500

        // Vertical padding as a fraction of the view height.
        // 10% top + 10% bottom = the signal is drawn in the middle 80%.
        private const val Y_PADDING = 0.10f
    }

    // Ring buffer of float ECG values. Pre-filled with mid-scale (2048 = ADC midpoint)
    // so the view starts with a flat line rather than garbage data.
    private val values = FloatArray(WINDOW_SIZE) { 2048f }

    // Write pointer into the ring buffer. Advances mod WINDOW_SIZE on each sample.
    private var writePos = 0

    // Paint used for drawing the waveform line. Created once, reused every frame.
    // ANTI_ALIAS_FLAG smooths diagonal lines. ROUND join/cap avoids sharp corners.
    private val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color       = Color.GREEN
        strokeWidth = 1.5f
        style       = Paint.Style.STROKE
        strokeJoin  = Paint.Join.ROUND
        strokeCap   = Paint.Cap.ROUND
    }

    // Reusable Path object — reset and rebuilt every onDraw() call.
    private val path = Path()

    /**
     * Adds a batch of new ECG samples to the ring buffer and requests a redraw.
     * Called by EcgFragment whenever BleViewModel.ecgSamples updates.
     *
     * @param samples List of 12-bit ADC values (0–4095) from a single BLE packet.
     */
    fun addSamples(samples: List<Int>) {
        for (v in samples) {
            values[writePos] = v.toFloat()
            // Wrap the write pointer around using modulo — this is what makes it a ring buffer.
            writePos = (writePos + 1) % WINDOW_SIZE
        }
        // Request a redraw on the next frame. Android batches these efficiently.
        invalidate()
    }

    /**
     * Resets the buffer to flat mid-scale and requests a redraw.
     * Called by EcgFragment when the BLE connection drops.
     */
    fun clearData() {
        values.fill(2048f)
        writePos = 0
        invalidate()
    }

    /**
     * Called by the Android framework each time the view needs to be redrawn.
     *
     * Rendering steps:
     *   1. Find the current min/max values in the ring buffer for auto-scaling.
     *   2. Enforce a minimum Y range to prevent extreme zoom on near-flat signals.
     *   3. Apply vertical padding so the waveform doesn't touch the view edges.
     *   4. Walk through the ring buffer in chronological order (starting at writePos)
     *      and build a Path mapping each sample to pixel coordinates.
     *   5. Draw the Path with the green stroke paint.
     */
    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        if (w == 0f || h == 0f) return  // View not yet laid out — skip

        // --- Step 1: Auto-scale Y axis ---
        var yMin = Float.MAX_VALUE
        var yMax = -Float.MAX_VALUE
        for (v in values) { if (v < yMin) yMin = v; if (v > yMax) yMax = v }

        // --- Step 2: Enforce minimum range to avoid divide-by-zero and extreme zoom ---
        var yRange = yMax - yMin
        if (yRange < 50f) {
            val mid = (yMax + yMin) / 2f
            yMin = mid - 25f; yMax = mid + 25f; yRange = 50f
        }

        // --- Step 3: Compute drawable area with padding ---
        val pad   = h * Y_PADDING
        val drawH = h - pad * 2f

        // Horizontal step: evenly distribute WINDOW_SIZE points across the view width.
        val xStep = w / (WINDOW_SIZE - 1)

        // --- Step 4: Build path starting at writePos (oldest sample = left edge) ---
        path.reset()
        // Y coordinate: invert because Android canvas Y=0 is top.
        // (value - yMin) / yRange gives 0.0 (bottom) to 1.0 (top) → multiply by drawH → invert.
        val y0 = pad + drawH - ((values[writePos % WINDOW_SIZE] - yMin) / yRange * drawH)
        path.moveTo(0f, y0)

        for (i in 1 until WINDOW_SIZE) {
            val idx = (writePos + i) % WINDOW_SIZE  // chronological order through the ring
            val x   = i * xStep
            val y   = pad + drawH - ((values[idx] - yMin) / yRange * drawH)
            path.lineTo(x, y)
        }

        // --- Step 5: Draw the waveform ---
        canvas.drawPath(path, linePaint)
    }
}

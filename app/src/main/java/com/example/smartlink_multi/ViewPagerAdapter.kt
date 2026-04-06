package com.example.smartlink_multi

/**
 * ViewPagerAdapter.kt — SmartLink Multi
 *
 * FragmentStateAdapter for the ViewPager2 in MainActivity.
 * Maps the 3 tab positions to their respective Fragment classes:
 *   0 → EcgFragment     (real-time ECG waveform + connection log)
 *   1 → SensorsFragment (temperature, humidity, BPM, alerts)
 *   2 → SettingsFragment (session stats, thresholds, login)
 *
 * FragmentStateAdapter is preferred over the older FragmentPagerAdapter
 * because it properly handles fragment lifecycle — fragments off-screen
 * are kept alive when offscreenPageLimit is set (see MainActivity).
 *
 * No fragment communication happens here — all data sharing goes through
 * BleViewModel which all three fragments access via activityViewModels().
 */

import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.viewpager2.adapter.FragmentStateAdapter

class ViewPagerAdapter(activity: FragmentActivity) : FragmentStateAdapter(activity) {

    /** Total number of tabs / pages. */
    override fun getItemCount() = 3

    /**
     * Creates and returns the Fragment for the given tab position.
     * Called lazily by ViewPager2 — each Fragment is instantiated only once
     * and then managed by the FragmentStateAdapter lifecycle.
     */
    override fun createFragment(position: Int): Fragment = when (position) {
        0    -> EcgFragment()      // Tab: "ECG"
        1    -> SensorsFragment()  // Tab: "Senzori"
        else -> SettingsFragment() // Tab: "Setari"
    }
}

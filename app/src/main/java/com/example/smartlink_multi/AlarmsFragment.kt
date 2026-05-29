package com.example.smartlink_multi

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.smartlink_multi.data.network.dto.AlarmDto
import com.example.smartlink_multi.data.prefs.SessionManager
import com.example.smartlink_multi.notif.AlarmNotificationHelper
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale

class AlarmsFragment : Fragment() {

    private val vm: AlarmsViewModel by activityViewModels()
    private lateinit var adapter: AlarmAdapter
    private var pollingJob: Job? = null

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_alarms, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val rv         = view.findViewById<RecyclerView>(R.id.rvAlarms)
        val emptyState = view.findViewById<View>(R.id.emptyState)
        val tvEmptyMsg = view.findViewById<TextView>(R.id.tvEmptyMessage)
        val progress   = view.findViewById<ProgressBar>(R.id.progressAlarms)

        AlarmNotificationHelper.setup(requireContext())

        adapter = AlarmAdapter()
        rv.layoutManager = LinearLayoutManager(requireContext())
        rv.adapter = adapter

        val session = SessionManager(requireContext())

        vm.alarms.observe(viewLifecycleOwner) { list ->
            progress.visibility = View.GONE
            if (list.isEmpty()) {
                rv.visibility         = View.GONE
                emptyState.visibility = View.VISIBLE
                tvEmptyMsg.text = if (session.isLoggedIn())
                    "Nicio alarmă înregistrată"
                else
                    "Autentifică-te în tab-ul Setări\npentru a vedea alarmele"
            } else {
                rv.visibility         = View.VISIBLE
                emptyState.visibility = View.GONE
                adapter.submitList(list)
                list.forEach { AlarmNotificationHelper.notifyIfNew(requireContext(), it) }
            }
        }

        // Dacă nu e logat arătăm direct empty state fără polling
        if (!session.isLoggedIn()) {
            emptyState.visibility = View.VISIBLE
            tvEmptyMsg.text = "Autentifică-te în tab-ul Setări\npentru a vedea alarmele"
        }
    }

    override fun onResume() {
        super.onResume()
        val session = SessionManager(requireContext())
        if (!session.isLoggedIn()) return

        pollingJob = viewLifecycleOwner.lifecycleScope.launch {
            while (isActive) {
                vm.fetchAlarms()
                delay(60_000)
            }
        }
    }

    override fun onPause() {
        super.onPause()
        pollingJob?.cancel()
        pollingJob = null
    }
}

// ---- RecyclerView Adapter ----

private class AlarmAdapter : ListAdapter<AlarmDto, AlarmAdapter.VH>(DIFF) {

    private val dateFmt = SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.getDefault())
    private val parseFmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())

    inner class VH(view: View) : RecyclerView.ViewHolder(view) {
        val badge:  TextView = view.findViewById(R.id.tvAlarmBadge)
        val type:   TextView = view.findViewById(R.id.tvAlarmType)
        val values: TextView = view.findViewById(R.id.tvAlarmValues)
        val date:   TextView = view.findViewById(R.id.tvAlarmDate)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = VH(
        LayoutInflater.from(parent.context).inflate(R.layout.item_alarm, parent, false)
    )

    override fun onBindViewHolder(h: VH, position: Int) {
        val alarm = getItem(position)
        val isHigh = alarm.alarmType.endsWith("_high")

        h.badge.text = badgeLabel(alarm.alarmType)
        h.badge.setBackgroundResource(R.drawable.badge_alarm)
        h.badge.backgroundTintList = android.content.res.ColorStateList.valueOf(
            if (isHigh) 0xFFFF4444.toInt() else 0xFFFFAA00.toInt()
        )

        h.type.text   = typeLabel(alarm.alarmType)
        h.values.text = "Valoare: ${alarm.measuredValue}${unit(alarm.alarmType)}  Prag: ${alarm.thresholdValue}${unit(alarm.alarmType)}"

        h.date.text = try {
            dateFmt.format(parseFmt.parse(alarm.triggeredAt)!!)
        } catch (_: Exception) { alarm.triggeredAt.take(16) }
    }

    private fun badgeLabel(t: String) = when {
        t.startsWith("pulse") -> "PULS"
        t.startsWith("temp")  -> "TEMP"
        t.startsWith("hum")   -> "HUM"
        else                   -> t.uppercase()
    }

    private fun typeLabel(t: String) = when (t) {
        "pulse_high" -> "Puls ridicat"
        "pulse_low"  -> "Puls scăzut"
        "temp_high"  -> "Temperatură ridicată"
        "temp_low"   -> "Temperatură scăzută"
        "hum_high"   -> "Umiditate ridicată"
        "hum_low"    -> "Umiditate scăzută"
        else         -> t
    }

    private fun unit(t: String) = when {
        t.startsWith("pulse") -> " BPM"
        t.startsWith("temp")  -> "°C"
        t.startsWith("hum")   -> "%"
        else                   -> ""
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<AlarmDto>() {
            override fun areItemsTheSame(a: AlarmDto, b: AlarmDto) = a.id == b.id
            override fun areContentsTheSame(a: AlarmDto, b: AlarmDto) = a == b
        }
    }
}

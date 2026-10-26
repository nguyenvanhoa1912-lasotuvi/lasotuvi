package io.github.nguyenvanhoa1912.cumgiacam;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Quét nền 1 lần/ngày: bảng giá gà mới (data.json) và tin cúm gia cầm mới (Google News RSS). */
public class DailyScanJob extends JobService {
    static final int JOB_ID = 1912;
    static final String CH = "daily";
    static final String NEWS = "https://news.google.com/rss/search?q=%22c%C3%BAm+gia+c%E1%BA%A7m%22+OR+H5N1+OR+%22c%C3%BAm+A%2FH5%22+when:2d&hl=vi&gl=VN&ceid=VN:vi";

    static void schedule(Context c) {
        JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js == null) return;
        for (JobInfo j : js.getAllPendingJobs()) if (j.getId() == JOB_ID) return;
        JobInfo info = new JobInfo.Builder(JOB_ID, new ComponentName(c, DailyScanJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(24L * 3600 * 1000)
                .setPersisted(true)
                .build();
        js.schedule(info);
    }

    @Override
    public boolean onStartJob(JobParameters params) {
        new Thread(() -> {
            try { run(); } catch (Exception ignored) { }
            jobFinished(params, false);
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) { return true; }

    private void run() throws Exception {
        SharedPreferences p = getSharedPreferences("cgc", MODE_PRIVATE);
        // 1) Bảng giá gà mới
        try {
            JSONObject d = new JSONObject(get(MainActivity.BASE + "gia-ga-long/data.json?t=" + System.currentTimeMillis()));
            JSONArray w = d.getJSONArray("weekly");
            JSONArray r = w.getJSONArray(w.length() - 1);
            String date = r.getString(0);
            if (!date.equals(p.getString("lastPrice", ""))) {
                boolean first = p.getString("lastPrice", "").isEmpty();
                p.edit().putString("lastPrice", date).apply();
                if (!first) {
                    String[] ymd = date.split("-");
                    String txt = "Gà trắng: B " + k(r, 4) + " · T " + k(r, 5) + " · N " + k(r, 6)
                            + "\nGà màu: B " + k(r, 1) + " · T " + k(r, 2) + " · N " + k(r, 3) + " (đ/kg)";
                    notify(1, "Bảng giá gà hơi mới " + ymd[2] + "/" + ymd[1], txt, 2);
                }
            }
        } catch (Exception ignored) { }
        // 2) Tin cúm gia cầm mới
        try {
            String xml = get(NEWS);
            Matcher m = Pattern.compile("<item>.*?<title>(.*?)</title>", Pattern.DOTALL).matcher(xml);
            if (m.find()) {
                String title = m.group(1).replace("<![CDATA[", "").replace("]]>", "")
                        .replace("&amp;", "&").replace("&quot;", "\"").replace("&#39;", "'").trim();
                String low = title.toLowerCase(Locale.ROOT);
                if ((low.contains("cúm") || low.contains("h5n")) && !title.equals(p.getString("lastNews", ""))) {
                    p.edit().putString("lastNews", title).apply();
                    notify(2, "Tin mới về cúm gia cầm", title, 0);
                }
            }
        } catch (Exception ignored) { }
    }

    private static String k(JSONArray r, int i) {
        try { return NumberFormat.getInstance(new Locale("vi", "VN")).format(r.getLong(i)); } catch (Exception e) { return "–"; }
    }

    private static String get(String u) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
        c.setConnectTimeout(20000);
        c.setReadTimeout(30000);
        c.setRequestProperty("User-Agent", "Mozilla/5.0 CGCApp/1.0");
        try (InputStream in = c.getInputStream()) {
            ByteArrayOutputStream o = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
            return o.toString("UTF-8");
        } finally { c.disconnect(); }
    }

    private void notify(int id, String title, String text, int tab) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null) return;
        nm.createNotificationChannel(new NotificationChannel(CH, "Cập nhật hằng ngày", NotificationManager.IMPORTANCE_DEFAULT));
        Intent i = new Intent(this, MainActivity.class).putExtra("tab", tab).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent pi = PendingIntent.getActivity(this, id, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new Notification.Builder(this, CH)
                .setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build();
        nm.notify(id, n);
    }
}

package io.github.nguyenvanhoa1912.cumgiacam;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

/** Ứng dụng bọc 3 trang: Cúm gia cầm VN, Cúm gia cầm thế giới, Giá gia cầm. */
public class MainActivity extends Activity {
    static final String BASE = "https://nguyenvanhoa1912-lasotuvi.github.io/lasotuvi/";
    static final String[] URLS = {BASE + "cum-gia-cam/", BASE + "cum-gia-cam/the-gioi.html", BASE + "gia-ga-long/"};
    static final String[] LABELS = {"🇻🇳\nCúm VN", "🌍\nCúm thế giới", "🐔\nGiá gia cầm"};
    static final long DAY_MS = 24L * 3600 * 1000;
    static final int C_BAR = Color.parseColor("#0B1530"), C_ON = Color.parseColor("#E0193A"),
            C_TXT = Color.parseColor("#8D9CBD"), C_BG = Color.parseColor("#070C19");

    private final WebView[] views = new WebView[3];
    private final long[] loadedAt = new long[3];
    private final TextView[] tabs = new TextView[3];
    private ProgressBar progress;
    private FrameLayout stack;
    private int current = 0;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(C_BG);

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setVisibility(View.GONE);
        root.addView(progress, new LinearLayout.LayoutParams(-1, dp(3)));

        stack = new FrameLayout(this);
        root.addView(stack, new LinearLayout.LayoutParams(-1, 0, 1f));

        LinearLayout bar = new LinearLayout(this);
        bar.setBackgroundColor(C_BAR);
        for (int i = 0; i < 3; i++) {
            final int idx = i;
            TextView t = new TextView(this);
            t.setText(LABELS[i]);
            t.setGravity(Gravity.CENTER);
            t.setTextSize(12);
            t.setTypeface(Typeface.DEFAULT_BOLD);
            t.setPadding(0, dp(7), 0, dp(7));
            t.setOnClickListener(v -> {
                if (current == idx && views[idx] != null) { views[idx].reload(); loadedAt[idx] = System.currentTimeMillis(); }
                else show(idx);
            });
            tabs[i] = t;
            bar.addView(t, new LinearLayout.LayoutParams(0, -2, 1f));
        }
        root.addView(bar, new LinearLayout.LayoutParams(-1, -2));

        // Tránh thanh trạng thái / thanh điều hướng (Android 15 vẽ tràn viền)
        root.setOnApplyWindowInsetsListener((v, ins) -> {
            int top, bottom;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets s = ins.getInsets(WindowInsets.Type.systemBars());
                top = s.top; bottom = s.bottom;
            } else { top = ins.getSystemWindowInsetTop(); bottom = ins.getSystemWindowInsetBottom(); }
            v.setPadding(0, top, 0, 0);
            bar.setPadding(0, 0, 0, bottom);
            return ins;
        });
        setContentView(root);

        int start = getIntent() != null ? getIntent().getIntExtra("tab", 0) : 0;
        show(start);
        // Mở sẵn các trang còn lại để quét ngay khi mở app
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            for (int i = 0; i < 3; i++) if (views[i] == null) create(i);
        }, 2500);

        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        }
        DailyScanJob.schedule(this);
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private boolean online() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return true;
        NetworkCapabilities nc = cm.getNetworkCapabilities(cm.getActiveNetwork());
        return nc != null && nc.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    private WebView create(int i) {
        WebView w = new WebView(this);
        w.setBackgroundColor(C_BG);
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(online() ? WebSettings.LOAD_DEFAULT : WebSettings.LOAD_CACHE_ELSE_NETWORK);
        s.setUserAgentString(s.getUserAgentString() + " CGCApp/1.0");
        w.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                String host = u.getHost() == null ? "" : u.getHost();
                if (host.endsWith("nguyenvanhoa1912-lasotuvi.github.io")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true; // liên kết ngoài (báo, blog, nguồn) mở bằng trình duyệt
            }
        });
        w.setWebChromeClient(new android.webkit.WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int p) {
                if (view != views[current]) return;
                progress.setProgress(p);
                progress.setVisibility(p < 100 ? View.VISIBLE : View.GONE);
            }
        });
        w.setVisibility(View.GONE);
        stack.addView(w, new FrameLayout.LayoutParams(-1, -1));
        views[i] = w;
        w.loadUrl(URLS[i]);
        loadedAt[i] = System.currentTimeMillis();
        return w;
    }

    private void show(int i) {
        current = i;
        if (views[i] == null) create(i);
        for (int k = 0; k < 3; k++) {
            if (views[k] != null) views[k].setVisibility(k == i ? View.VISIBLE : View.GONE);
            tabs[k].setTextColor(k == i ? Color.WHITE : C_TXT);
            tabs[k].setBackgroundColor(k == i ? C_ON : C_BAR);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && intent.hasExtra("tab")) show(intent.getIntExtra("tab", 0));
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Mở lại app sau hơn 1 ngày: tải lại để quét mới
        long now = System.currentTimeMillis();
        for (int i = 0; i < 3; i++)
            if (views[i] != null && now - loadedAt[i] > DAY_MS) { views[i].reload(); loadedAt[i] = now; }
        SharedPreferences p = getSharedPreferences("cgc", MODE_PRIVATE);
        p.edit().putLong("lastOpen", now).apply();
    }

    @Override
    public void onBackPressed() {
        WebView w = views[current];
        if (w != null && w.canGoBack()) w.goBack();
        else super.onBackPressed();
    }
}

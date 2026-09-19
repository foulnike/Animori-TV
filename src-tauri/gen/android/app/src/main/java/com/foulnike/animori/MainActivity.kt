package com.foulnike.animori

import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  /**
   * Аппаратная кнопка «Назад» на пульте.
   *
   * По умолчанию оболочка Tauri сама отвечает на неё: пока в окне есть куда
   * вернуться, она листает историю окна (WryActivity). Для приложения с
   * адресами это означало: из окна поверх карточки человек уезжал на прежний
   * экран, хотя окно он и не думал закрывать — оно просто уходило вместе
   * с экраном под ним.
   *
   * Теперь решение за окном: пока открыто хоть одно окно, шаг достаётся
   * ему, и оно закрывается; окон нет — ходит история, как прежде.
   *
   * Механизм — два куска. Обратный вызов включён только тогда, когда окно
   * открыто (включает его само окно из скрипта), поэтому лишних шагов
   * приложение не съедает: вызов выключен, и нажатие достаётся оболочке.
   * Порядок вызовов здесь важен: последний добавленный отвечает первым,
   * а добавляем мы свой после того, что ставит Tauri в setWebView.
   */
  private lateinit var backStop: OnBackPressedCallback

  override fun onWebViewCreate(webView: WebView) {
    backStop =
      object : OnBackPressedCallback(false) {
        override fun handleOnBackPressed() {
          webView.evaluateJavascript("window.__amBackStop && window.__amBackStop()", null)
        }
      }

    onBackPressedDispatcher.addCallback(this, backStop)

    // Мост для скрипта: окно само говорит, когда шаг «назад» его.
    // Интерфейс один и без доступа к файлам — наружу он ничего не даёт.
    webView.addJavascriptInterface(
      object {
        @JavascriptInterface
        fun setBackStop(active: Boolean) {
          webView.post { backStop.isEnabled = active }
        }
      },
      "AnimoriBack",
    )
  }
}

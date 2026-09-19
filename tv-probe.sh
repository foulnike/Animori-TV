#!/bin/bash
# Временный зонд: нажать клавишу и показать, где оказался фокус.
A="adb -s 192.168.1.38:5555"
$A shell input keyevent "$1"
sleep 1.2
line=$($A logcat -d | grep -a "diag MOVE" | tail -1 | sed 's/.*\[diag\] //')
if [ -z "$line" ]; then
  $A logcat -d | grep -a "diag TICK" | tail -1 | sed 's/.*focus=/фокус=/; s/ scroll.*//'
else
  echo "$line"
fi

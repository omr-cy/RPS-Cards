#!/bin/bash

# ==========================================
# Card Clash (RPS) Backend Startup Script
# ==========================================

echo "🚀 تجهيز بيئة سيرفر اللعبة..."

# 1. رفع أقصى عدد للملفات والاتصالات (Open Files Limit)
echo "🔧 جاري تطبيق ulimit -n 65535..."
ulimit -n 65535 2>/dev/null || echo "⚠️ تنبيه: لم نتمكن من رفع ulimit (قد تحتاج لتشغيل السكربت كمسؤول sudo)"

# محاولة التعديل على الجذور (يجب أن يعمل كمسؤول sudo/root) لجعله دائماً
if [ "$EUID" -eq 0 ]; then
    echo "🛡️ جاري ضبط Limits كمسؤول النظام في limits.conf..."
    grep -q "\* soft nofile 65535" /etc/security/limits.conf || echo "* soft nofile 65535" >> /etc/security/limits.conf
    grep -q "\* hard nofile 65535" /etc/security/limits.conf || echo "* hard nofile 65535" >> /etc/security/limits.conf
    
    grep -q "root soft nofile 65535" /etc/security/limits.conf || echo "root soft nofile 65535" >> /etc/security/limits.conf
    grep -q "root hard nofile 65535" /etc/security/limits.conf || echo "root hard nofile 65535" >> /etc/security/limits.conf
    echo "✅ تم حفظ التعديلات في /etc/security/limits.conf"
fi

# 2. التأكد من وتثبيت PM2
if ! command -v pm2 &> /dev/null
then
    echo "📦 PM2 غير موجود.. جاري تثبيته..."
    npm install -g pm2
fi

# 3. التأكد من تثبيت الحزم الخاصة بالباك اند
echo "📦 جاري التأكد من ملفات node_modules..."
npm install

# 4. تشغيل السيرفر باستخدام PM2 مع 4GB Ram Limit ومعرف TSX
echo "🔥 جاري تشغيل السيرفر على PM2..."

# نقوم بإيقاف السيرفر القديم إن كان يعمل تجنباً للتعارض
pm2 delete rps-backend 2>/dev/null

# تشغيل السيرفر وتخصيص الرام (4096 ميجابايت = 4 جيجابايت) واستخدام الملف .env
pm2 start server.ts \
  --name "rps-backend" \
  --interpreter ./node_modules/.bin/tsx \
  --node-args="--max-old-space-size=4096 --env-file=.env"

# حفظ إعدادات pm2 حتى يعمل بشكل مستمر وفي حال إعادة تشغيل السيرفر
pm2 save

echo "================================================="
echo "✅ تم التشغيل بنجاح وبأقصى طاقة استيعابية ممكنة!"
echo "📊 لعرض السجلات (Logs) المباشرة اكتب الأمر:"
echo "   pm2 logs rps-backend"
echo "================================================="

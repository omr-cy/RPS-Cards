import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { transporter } from '../services/mailer';
import { calculateLevel } from '../utils/helpers';
import * as dotenv from 'dotenv';

dotenv.config();

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    const user = new User({
      email,
      password: hashedPassword,
      displayName,
      verificationToken,
      verificationTokenExpires
    });

    await user.save();

    const mailOptions = {
      from: process.env.GAME_EMAIL_USER,
      to: email,
      subject: 'كود تأكيد حساب بطاقات حجر ورقة مقص',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; text-align: center; background-color: #1a1a1a; color: #f5f5dc; padding: 40px; border-radius: 10px;">
          <h1 style="color: #008080;">بطاقات حجر ورقة مقص</h1>
          <p style="font-size: 18px;">كود تأكيد حسابك هو:</p>
          <div style="display: inline-block; background-color: #333; color: #008080; padding: 15px 30px; font-size: 32px; font-weight: bold; border-radius: 10px; letter-spacing: 10px; margin: 20px 0; border: 2px solid #008080;">
            ${verificationToken}
          </div>
          <p style="margin-top: 30px; font-size: 14px; opacity: 0.8;">أدخل هذا الكود في اللعبة لتفعيل حسابك.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    console.log(`[AUTH] Verification code for ${email}: ${verificationToken}`);

    res.status(201).json({ message: 'تم إنشاء الحساب بنجاح. يرجى مراجعة بريدك الإلكتروني للحصول على كود التأكيد.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الحساب' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'يرجى تأكيد بريدك الإلكتروني أولاً' });
    }

    const now = new Date();
    const lastLogin = user.lastLogin;
    let xpBonus = 0;

    if (user.xp === undefined || user.xp === null) user.xp = 0;
    if (user.level === undefined || user.level === null) user.level = 1;

    if (!lastLogin || now.toDateString() !== lastLogin.toDateString()) {
      xpBonus = 50;
      user.xp = (user.xp || 0) + xpBonus;
      user.level = calculateLevel(user.xp);
      console.log(`[AUTH] User ${user.email} received daily login bonus: ${xpBonus} XP. New Level: ${user.level}`);
    }

    user.lastLogin = now;
    await user.save();

    const userResponse = user.toObject() as any;
    delete userResponse.password;
    delete userResponse.verificationToken;

    res.json(userResponse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
};

export const resendCode = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'الحساب مؤكد بالفعل' });
    }

    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    const mailOptions = {
      from: process.env.GAME_EMAIL_USER,
      to: email,
      subject: 'كود تأكيد حساب بطاقات حجر ورقة مقص الجديد',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; text-align: center; background-color: #1a1a1a; color: #f5f5dc; padding: 40px; border-radius: 10px;">
          <h1 style="color: #008080;">بطاقات حجر ورقة مقص</h1>
          <p style="font-size: 18px;">كود تأكيد حسابك الجديد هو:</p>
          <div style="display: inline-block; background-color: #333; color: #008080; padding: 15px 30px; font-size: 32px; font-weight: bold; border-radius: 10px; letter-spacing: 10px; margin: 20px 0; border: 2px solid #008080;">
            ${verificationToken}
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'تم إرسال كود تأكيد جديد لبريدك الإلكتروني.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ أثناء إعادة إرسال الكود' });
  }
};

export const verifyCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ 
      email, 
      verificationToken: code,
      verificationTokenExpires: { $gt: new Date() } 
    });

    if (!user) {
      return res.status(400).json({ error: 'كود التأكيد غير صحيح أو انتهت صلاحيته' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ message: 'تم تأكيد الحساب بنجاح! يمكنك الآن تسجيل الدخول.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ أثناء التأكيد' });
  }
};

export const verifyGet = async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).send('رابط التأكيد غير صالح أو منتهي الصلاحية');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send(`
      <div dir="rtl" style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: green;">تم تأكيد الحساب بنجاح!</h1>
        <p>يمكنك الآن تسجيل الدخول في اللعبة والبدء في المنافسة.</p>
        <a href="/" style="color: blue; text-decoration: underline;">العودة للعبة</a>
      </div>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('حدث خطأ أثناء تأكيد الحساب');
  }
};

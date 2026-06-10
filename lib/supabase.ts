import { createClient } from "@supabase/supabase-js";

// 🎯 ต้องพิมพ์คำว่า process.env ตรง ๆ แบบนี้เลยครับพี่นิวาส
// ตัวระบบ Next.js (Turbopack) จะได้จับจองและคว้าค่าจาก .env.local ไปใช้ฝั่ง Browser ได้สำเร็จครับ
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

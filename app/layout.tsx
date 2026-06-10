import React from "react";
import "./globals.css"; // 🎯 เพิ่มบรรทัดนี้เข้าไปเพื่อให้หน้าเว็บโหลด Tailwind CSS ครับพี่!

export const metadata = {
  title: "RIVERPRO CUSTOMER PORTAL",
  description: "Central Customer War Room Platform by FMBD Controller",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        {/* โหลดกลุ่มฟอนต์ Kanit และ FontAwesome สำหรับระบบไอเนฟหน้าบ้าน */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;700;900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </head>
      <body
        style={{ fontFamily: "'Kanit', sans-serif" }}
        className="bg-slate-100 antialiased"
      >
        {children}
      </body>
    </html>
  );
}

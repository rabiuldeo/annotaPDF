<div align="center">

<img src="assets/favicon.svg" alt="AnnotaPDF" width="72" height="72">

# AnnotaPDF v1

### বাংলাদেশি ডিজাইনে তৈরি PDF ও ইমেজ হাইলাইটার

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-rabiuldeo.github.io-006A4E?style=for-the-badge)](http://rabiuldeo.github.io/annotaPDF/)
[![Version](https://img.shields.io/badge/version-v1.0-F42A41?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-gold?style=for-the-badge)](#লাইসেন্স)

**🔗 [http://rabiuldeo.github.io/annotaPDF/](http://rabiuldeo.github.io/annotaPDF/)**

</div>

---

## পরিচিতি

**AnnotaPDF** একটি সম্পূর্ণ ব্রাউজার-ভিত্তিক PDF ও ইমেজ হাইলাইটার। কোনো সার্ভার নেই, কোনো ইন্সটলেশন নেই — শুধু ব্রাউজারে খুলুন এবং কাজ শুরু করুন। বাংলাদেশের জাতীয় পতাকার রঙ (সবুজ ও লাল) অনুপ্রাণিত প্রিমিয়াম UI সহ তৈরি।

> ডেভেলাপার: **রবিউল হাসান**

---

## ফিচারসমূহ

| বিভাগ | ফিচার |
|-------|--------|
| **ফাইল** | PDF, JPG, PNG, WEBP, GIF ফাইল খুলুন |
| **ফাইল** | সরাসরি URL থেকে PDF বা ইমেজ লোড করুন |
| **ফাইল** | ড্র্যাগ অ্যান্ড ড্রপ সাপোর্ট |
| **ফাইল** | একসাথে একাধিক ফাইল ট্যাবে খুলুন |
| **হাইলাইট** | ড্র্যাগ করে যেকোনো এলাকা হাইলাইট করুন |
| **হাইলাইট** | ৩টি প্রিসেট রঙ (সোনালি, লাল, সবুজ) + কাস্টম |
| **হাইলাইট** | ১০%–১০০% অপাসিটি স্লাইডার |
| **হাইলাইট** | Multiply blend mode — লেখা দেখা যায় |
| **নেভিগেশন** | Chrome-style মাল্টি-পেজ স্ক্রোল ভিউ |
| **নেভিগেশন** | থাম্বনেইল সাইডবার |
| **নেভিগেশন** | ২৫%–৫০০% জুম + ফিট-টু-উইডথ |
| **নেভিগেশন** | মোবাইলে Pinch-to-zoom |
| **রোটেশন** | প্রতিটি পেজ আলাদাভাবে ৯০° রোটেট |
| **এডিট** | ৫০ ধাপ আনডু / রিডু |
| **এডিট** | ইরেজ টুল দিয়ে হাইলাইট মুছুন |
| **সেভ** | হাইলাইটসহ PDF বা PNG ডাউনলোড (৩× রেজোলিউশন) |
| **সেভ** | স্বয়ংক্রিয় Auto-save (localStorage) |
| **UI** | বাংলাদেশ পতাকার রঙে প্রিমিয়াম ডিজাইন |
| **UI** | Outfit + Noto Sans Bengali ফন্ট |
| **UI** | সব ডিভাইসে রেসপন্সিভ (Desktop, Tablet, Mobile) |
| **নিরাপত্তা** | সব কিছু ব্রাউজারেই — কোনো ডেটা সার্ভারে যায় না |

---

## ব্যবহার

### অনলাইনে সরাসরি

**[http://rabiuldeo.github.io/annotaPDF/](http://rabiuldeo.github.io/annotaPDF/)** — এই লিংকে যান, কোনো ইন্সটলেশন লাগবে না।

### লোকালি চালু করুন

```bash
# রিপোজিটরি ক্লোন করুন
git clone https://github.com/rabiuldeo/annotaPDF.git
cd annotaPDF

# যেকোনো HTTP সার্ভার দিয়ে চালু করুন
npx serve .
# অথবা
python -m http.server 8000
```

তারপর ব্রাউজারে খুলুন: `http://localhost:8000`

---

## প্রজেক্ট স্ট্রাকচার

```
annotaPDF/
├── index.html          ← মেইন HTML (একক entry point)
├── css/
│   ├── styles.css      ← সম্পূর্ণ UI ও লেআউট
│   └── icons.css       ← Self-hosted SVG আইকন
├── js/
│   └── app.js          ← সম্পূর্ণ অ্যাপ লজিক (~1000 লাইন)
├── assets/
│   └── favicon.svg     ← SVG ফেভিকন
├── README.md
└── .gitignore
```

---

## কীবোর্ড শর্টকাট

| শর্টকাট | কাজ |
|---------|-----|
| `H` | হাইলাইট মোড |
| `E` | ইরেজ মোড |
| `V` | প্যান / স্ক্রোল মোড |
| `Ctrl + Z` | আনডু |
| `Ctrl + Y` | রিডু |
| `Ctrl + S` | সেভ / এক্সপোর্ট |
| `Ctrl + O` | ফাইল খুলুন |
| `Ctrl + =` | জুম ইন |
| `Ctrl + -` | জুম আউট |

---

## টেকনোলজি

| লাইব্রেরি | ভার্সন | কাজ |
|-----------|--------|-----|
| [PDF.js](https://mozilla.github.io/pdf.js/) | 3.11.174 | PDF রেন্ডারিং |
| [jsPDF](https://parall.ax/products/jspdf) | 2.5.1 | PDF এক্সপোর্ট |
| [Font Awesome](https://fontawesome.com/) | 6.5.1 | আইকন |
| [Outfit](https://fonts.google.com/specimen/Outfit) | — | Latin ফন্ট |
| [Noto Sans Bengali](https://fonts.google.com/noto/specimen/Noto+Sans+Bengali) | — | বাংলা ফন্ট |
| Vanilla JS | ES2020 | কোনো framework নেই |

---

## GitHub Pages Deploy

```
Settings → Pages → Branch: main → / (root) → Save
```

কিছুক্ষণ পর সাইট লাইভ হবে `https://<username>.github.io/<repo>/` এ।

---

## লাইসেন্স

[MIT License](LICENSE) — স্বাধীনভাবে ব্যবহার, পরিবর্তন ও বিতরণ করুন।

---

<div align="center">

তৈরি করেছেন **রবিউল হাসান** &nbsp;·&nbsp; বাংলাদেশ 🇧🇩

</div>

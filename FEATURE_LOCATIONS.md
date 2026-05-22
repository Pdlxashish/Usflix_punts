# Feature Locations Guide

## 🗺️ Where to Find Each Feature

### 📍 Homepage (`http://localhost:5173/`)

The homepage displays all features in this order (scroll down to see them all):

```
┌─────────────────────────────────────┐
│         🎬 Hero Section             │
│    (Main banner with video/image)   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      📚 Content Rows                │
│   (Your albums and media items)     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      ⏰ Time Together                │
│   (Days/hours since relationship    │
│         started)                    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   🎂 Anniversary Countdown          │
│   (Days until next anniversary)     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   😊 MOOD OF THE DAY ⭐ NEW!        │
│   (Today's mood with emoji and      │
│         message)                    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      ✨ Our First Times              │
│   (Relationship milestones)         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      💌 Love Letter Wall             │
│   (Flip cards with love notes)      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      🫙 Love Jar                     │
│   (Reasons why you love her)        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      🖼️ Mood Board                   │
│   (Aesthetic photo grid)            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   🎯 OUR BUCKET LIST ⭐ NEW!        │
│   (Dreams and adventures with       │
│    confetti animations)             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   🧠 RELATIONSHIP QUIZ ⭐ NEW!      │
│   ("How Well Do You Know Us?"       │
│    interactive quiz)                │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   🎲 RANDOM MEMORY ⭐ NEW!          │
│   ("Surprise Me" button with        │
│    slot-machine animation)          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      📍 Distance Between             │
│   (GPS distance between partners)   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      🎂 Birthday Celebration         │
│   (Upcoming birthdays)              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      💕 Story Continues              │
│   (Footer with relationship info)   │
└─────────────────────────────────────┘
```

---

### 📍 Admin Panel (`http://localhost:5173/admin`)

After logging in, click the **"Romance"** tab to access all feature management:

```
┌─────────────────────────────────────────────────────────┐
│  Admin Panel Header                                     │
│  [Style] [Profiles] [Albums] [Upload] [Romance] [Account]│
└─────────────────────────────────────────────────────────┘
                              ↓
                    Click "Romance" Tab
                              ↓
┌─────────────────────────────────────────────────────────┐
│  Romance Features Management                            │
│                                                         │
│  [💌 Love Letters] [🫙 Love Jar] [🖼️ Mood Board]        │
│  [✨ First Times] [🧠 Quiz ⭐] [🎯 Bucket ⭐] [😊 Mood ⭐]│
└─────────────────────────────────────────────────────────┘
```

#### Click Each Button to Manage:

**🧠 Quiz** (NEW!)
```
┌─────────────────────────────────────┐
│  Add New Question                   │
│  ├─ Question text                   │
│  ├─ Option A, B, C, D               │
│  ├─ Correct answer                  │
│  └─ Fun fact                        │
│                                     │
│  Existing Questions List            │
│  ├─ Question 1 [Edit] [Delete]     │
│  ├─ Question 2 [Edit] [Delete]     │
│  └─ Question 3 [Edit] [Delete]     │
└─────────────────────────────────────┘
```

**🎯 Bucket List** (NEW!)
```
┌─────────────────────────────────────┐
│  Add New Item                       │
│  ├─ Item text                       │
│  └─ Emoji picker                    │
│                                     │
│  Dreams (Unchecked)                 │
│  ├─ ✨ Item 1 [✓] [Edit] [Delete]  │
│  └─ 🗺️ Item 2 [✓] [Edit] [Delete]  │
│                                     │
│  Memories (Checked)                 │
│  └─ ✅ Item 3 [↩] [Edit] [Delete]  │
└─────────────────────────────────────┘
```

**😊 Daily Mood** (NEW!)
```
┌─────────────────────────────────────┐
│  Set Today's Mood                   │
│  ├─ Emoji picker (12 quick picks)  │
│  ├─ Message (max 300 chars)        │
│  └─ [Set Today's Mood] button      │
│                                     │
│  Preview                            │
│  └─ Live preview of mood card      │
│                                     │
│  Recent Moods                       │
│  ├─ Yesterday's mood                │
│  ├─ 2 days ago                      │
│  └─ 3 days ago                      │
└─────────────────────────────────────┘
```

---

## 🎯 Feature Visibility Rules

### When Features Appear on Homepage:

1. **Mood of the Day** 😊
   - ✅ Shows if: A mood is set for today
   - ❌ Hidden if: No mood set for today

2. **Bucket List** 🎯
   - ✅ Shows if: At least 1 item exists
   - ❌ Hidden if: No items added

3. **Relationship Quiz** 🧠
   - ✅ Shows if: At least 1 question exists
   - ❌ Hidden if: No questions added

4. **Random Memory** 🎲
   - ✅ Shows if: At least 1 photo or video exists
   - ❌ Hidden if: No media items

---

## 📱 Mobile View

On mobile devices, all features stack vertically and are fully responsive:

```
┌──────────────┐
│   Hero       │
├──────────────┤
│   Content    │
├──────────────┤
│   Time       │
├──────────────┤
│   Mood 😊    │ ⭐ NEW!
├──────────────┤
│   Milestones │
├──────────────┤
│   Letters    │
├──────────────┤
│   Jar        │
├──────────────┤
│   Mood Board │
├──────────────┤
│   Bucket 🎯  │ ⭐ NEW!
├──────────────┤
│   Quiz 🧠    │ ⭐ NEW!
├──────────────┤
│   Random 🎲  │ ⭐ NEW!
├──────────────┤
│   Distance   │
├──────────────┤
│   Birthday   │
├──────────────┤
│   Footer     │
└──────────────┘
```

---

## 🔍 Quick Access URLs

### Public Pages
- **Homepage**: `http://localhost:5173/`
- **Albums**: `http://localhost:5173/albums`
- **Featured**: `http://localhost:5173/featured`

### Admin Pages
- **Login**: `http://localhost:5173/admin/login`
- **Admin Dashboard**: `http://localhost:5173/admin`
- **Romance Tab**: `http://localhost:5173/admin` → Click "Romance"

---

## 🎨 Visual Indicators

### On Homepage:
- **Mood of Day**: Gradient card with animated emoji
- **Bucket List**: Progress bar + Dreams/Memories sections
- **Quiz**: "Start Quiz" button with brain icon
- **Random Memory**: Big "Surprise Me" button

### In Admin Panel:
- **Quiz**: 🧠 emoji button
- **Bucket List**: 🎯 emoji button
- **Daily Mood**: 😊 emoji button

---

## 💡 Pro Tips

1. **Finding Features Fast**:
   - Use Ctrl+F (Cmd+F on Mac) and search for:
     - "Quiz" or "How Well"
     - "Bucket" or "Dreams"
     - "Surprise" or "Random"
     - "Mood" or "Today"

2. **Testing Order**:
   - Start with admin panel to add content
   - Then view on homepage to see results
   - Refresh homepage after adding content

3. **Mobile Testing**:
   - Open DevTools (F12)
   - Click device toolbar icon
   - Select a mobile device
   - Scroll through all features

---

## 🎉 Enjoy Exploring!

All features are now live and ready to use. Scroll through the homepage to discover each one, or jump straight to the admin panel to start adding content!

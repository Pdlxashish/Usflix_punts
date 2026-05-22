# Use Default Style Button - Quick Guide

## 🎯 What It Does

The **"Use Default Style"** button instantly resets ALL customization settings back to the original USFLIX theme design.

## 📍 Where To Find It

**Location**: Admin Panel → Customization Tab → Bottom of the form

```
Admin Panel
  └── Customization Tab
      ├── Branding & Text
      ├── Color Theme
      ├── Logo & Assets
      ├── Typography
      ├── Background Styling
      ├── Page Sections
      └── [Save All Changes] [Use Default Style] [Reset All]  ← HERE!
```

## 🔄 What Gets Reset

When you click "Use Default Style", these settings are restored:

### Text & Branding
- **Platform Name**: USFLIX
- **Hero Tagline**: "The Sunset We Watched Forever"
- **Hero Subtitle**: "Every story we've written together, in one place. Press play and let's remember."
- **Footer Text**: "Our Story, Streaming Always"
- **Home Page Title**: "USFLIX — Our Story"
- **Home Page Description**: "Every memory we've made, in one cinematic place."
- **Relationship Start Date**: September 15, 2021

### Colors
- **Primary Color**: #e50914 (Netflix Red)
- **Accent Color**: #b20710 (Dark Red)
- **Background Color**: #000000 (Black)

### Typography
- **Heading Font**: Bebas Neue
- **Body Font**: Inter

### Assets
- **Logo**: Cleared (empty)
- **Favicon**: Cleared (empty)

### Background
- **Background Image**: Cleared (empty)
- **Background Pattern**: None
- **Background Gradient**: None

### Page Sections
- **Time Together Section**: Enabled ✓
- **Story Continues Section**: Enabled ✓
- **Featured Section**: Enabled ✓

## 📋 Step-by-Step Instructions

### To Reset to Default Style:

1. **Navigate to Admin Panel**
   - Go to `http://192.168.1.85:5173/admin`
   - Login with your admin credentials

2. **Go to Customization Tab**
   - Click on the "Customization" tab (first tab with gear icon)

3. **Scroll to Bottom**
   - Scroll down past all the customization sections
   - Find the button row at the bottom

4. **Click "Use Default Style"**
   - Look for the button with the rotate icon (↻)
   - Click it
   - You'll see a success toast: "Reset to default style!"

5. **Save Changes**
   - Click "Save All Changes" button to persist the reset
   - Or wait 2 seconds for auto-save

6. **Refresh Homepage**
   - Go to homepage: `http://192.168.1.85:5173`
   - Hard refresh: Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - You should see the original USFLIX design

## 🆚 Difference Between Buttons

### "Use Default Style" Button
- **Icon**: ↻ (Rotate)
- **Action**: Resets to original USFLIX theme
- **Scope**: ALL customization settings
- **Saves**: No (you need to click "Save All Changes" after)
- **Use When**: You want to start fresh with the original design

### "Reset All" Button
- **Icon**: None (text only)
- **Action**: Reverts to last saved state
- **Scope**: Discards unsaved changes
- **Saves**: No
- **Use When**: You made changes but want to undo them before saving

### "Save All Changes" Button
- **Icon**: 💾 (Save)
- **Action**: Saves current form state to database
- **Scope**: All fields in the form
- **Saves**: Yes
- **Use When**: You want to persist your customizations

## 💡 Pro Tips

1. **Preview Before Saving**: After clicking "Use Default Style", you can modify individual fields before saving

2. **Partial Reset**: If you only want to reset specific sections:
   - Manually change those fields back to default values
   - Or use "Reset All" to revert to last saved state

3. **Backup Your Customizations**: Before clicking "Use Default Style", take note of your current settings if you might want them back

4. **Mobile Access**: The button works the same way on mobile devices

## 🎨 Visual Reference

```
┌─────────────────────────────────────────────────────────┐
│                    Admin Panel                          │
├─────────────────────────────────────────────────────────┤
│  [Customization] [Albums] [Upload]                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Branding & Text                                        │
│  ┌────────────────────────────────────────────┐        │
│  │ Platform name: [USFLIX                    ]│        │
│  │ Hero tagline:  [The Sunset We Watched...  ]│        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│  Color Theme                                            │
│  ┌────────────────────────────────────────────┐        │
│  │ Primary:  [🎨] [#e50914]                   │        │
│  │ Accent:   [🎨] [#b20710]                   │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│  ... (more sections) ...                                │
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐       │
│  │ 💾 Save All  │ │ ↻ Use Default│ │ Reset All│       │
│  │   Changes    │ │    Style     │ │          │       │
│  └──────────────┘ └──────────────┘ └──────────┘       │
│                      ↑                                   │
│                   CLICK HERE                            │
└─────────────────────────────────────────────────────────┘
```

## ❓ FAQ

**Q: Will this delete my uploaded media?**
A: No! It only resets customization settings. Your photos, videos, and albums are safe.

**Q: Can I undo after clicking "Use Default Style"?**
A: Yes! Just click "Reset All" before saving, and it will revert to your last saved customizations.

**Q: Do I need to restart the servers?**
A: No! Changes apply immediately after saving and refreshing the page.

**Q: Will this affect other users?**
A: Yes, customization settings are global and affect all visitors to your site.

**Q: Can I customize the default values?**
A: Yes! Edit the `DEFAULT_BRANDING` constant in `src/context/branding.tsx` to change what "default" means.

---

**Need Help?** Check `CUSTOMIZATION_FEATURES_STATUS.md` for full documentation.

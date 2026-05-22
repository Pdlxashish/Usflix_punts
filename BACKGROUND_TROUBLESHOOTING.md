# Background Troubleshooting Guide

## ✅ Issue Fixed!

The background was only showing in **dark mode**. I've updated the code so backgrounds now work in **both light and dark modes**.

---

## 🔧 What Was Changed

**File:** `src/components/site/BrandingStyles.tsx`

**Change:** Removed the `if (actualTheme === "dark")` condition that was preventing backgrounds from showing in light mode.

**Now:** Backgrounds work in both light and dark modes, with adaptive pattern opacity:
- Dark mode: Lighter patterns (white with 5% opacity)
- Light mode: Darker patterns (black with 10% opacity)

---

## 🎯 How to See Your Background Changes

### Step 1: Make Sure Changes Are Saved
1. Go to **Admin Panel** → **Style Tab** → **Background Section**
2. Upload or paste your background image URL
3. Select pattern and gradient (optional)
4. Click **"Save changes"** button (or press Ctrl+S)
5. Wait for the green "Saved" message

### Step 2: Refresh Your Homepage
1. Open your homepage in a new tab: `http://localhost:5173/`
2. Press **Ctrl+Shift+R** (hard refresh) to clear cache
3. Your background should now be visible!

### Step 3: Check Browser Console
If you still don't see the background:
1. Press **F12** to open Developer Tools
2. Go to the **Console** tab
3. Look for any errors (red text)
4. Check the **Network** tab to see if the image loaded

---

## 🐛 Common Issues & Solutions

### Issue 1: Background Not Showing
**Possible causes:**
- Changes not saved in admin panel
- Browser cache not cleared
- Backend not running
- Image URL is incorrect

**Solutions:**
1. **Save again:** Go to admin panel and click "Save changes"
2. **Hard refresh:** Press Ctrl+Shift+R on homepage
3. **Check backend:** Make sure backend is running on port 3001
4. **Verify URL:** Check that the image URL is correct in admin panel

### Issue 2: Background Shows in Admin Preview But Not on Homepage
**Solution:**
- Clear browser cache: Ctrl+Shift+R
- Check if branding context is loading: Open browser console and type `localStorage` to see if data is cached

### Issue 3: Background Image Doesn't Load
**Possible causes:**
- Image file doesn't exist
- Wrong file path
- CORS issues

**Solutions:**
1. **Check file path:** Make sure the image is in the `backend/uploads` folder
2. **Test URL directly:** Copy the image URL and paste it in browser address bar
3. **Re-upload:** Try uploading the image again through admin panel

### Issue 4: Pattern or Gradient Not Showing
**Solution:**
- Make sure you selected something other than "None"
- Patterns work best with solid backgrounds or subtle images
- Try different combinations

---

## 🎨 Testing Your Background

### Quick Test Checklist:
- [ ] Backend server is running (`cd backend && npm run dev`)
- [ ] Frontend server is running (`npm run dev`)
- [ ] Logged into admin panel
- [ ] Background image uploaded or URL pasted
- [ ] Pattern selected (optional)
- [ ] Gradient selected (optional)
- [ ] Clicked "Save changes"
- [ ] Saw green "Saved" message
- [ ] Refreshed homepage with Ctrl+Shift+R
- [ ] Background is visible!

---

## 🔍 Debugging Steps

### 1. Check if Background Data is Saved
Open browser console (F12) and run:
```javascript
fetch('http://localhost:3001/api/branding')
  .then(r => r.json())
  .then(data => console.log('Background settings:', {
    backgroundImageUrl: data.backgroundImageUrl,
    backgroundPattern: data.backgroundPattern,
    backgroundGradient: data.backgroundGradient
  }));
```

### 2. Check if Background Styles Are Applied
Open browser console (F12) and run:
```javascript
console.log('Body background:', {
  backgroundImage: document.body.style.backgroundImage,
  backgroundSize: document.body.style.backgroundSize,
  backgroundPosition: document.body.style.backgroundPosition
});
```

### 3. Check if Image URL is Accessible
If you have a background image, test the URL:
```javascript
// Replace with your actual image URL
fetch('http://localhost:3001/api/uploads/your-image.jpg')
  .then(r => console.log('Image status:', r.status))
  .catch(e => console.error('Image error:', e));
```

---

## 💡 Pro Tips

### For Best Results:
1. **Use high-quality images** (1920x1080 or larger)
2. **Compress images** before uploading (use tools like TinyPNG)
3. **Test in both light and dark modes** (toggle theme in header)
4. **Use gradients** to improve text readability over busy backgrounds
5. **Keep patterns subtle** - they're meant to add texture, not distract

### Recommended Combinations:

**Romantic Sunset:**
```
Background: Sunset photo
Pattern: None
Gradient: linear-gradient(to bottom, #000000, #1a1a1a)
```

**Subtle Texture:**
```
Background: Solid color or subtle image
Pattern: Dots
Gradient: None
```

**Cinematic Dark:**
```
Background: Dark image or video
Pattern: None
Gradient: linear-gradient(to bottom right, #1a1a1a, #000000)
```

---

## 🆘 Still Not Working?

If you've tried everything and the background still isn't showing:

1. **Check browser console for errors:**
   - Press F12
   - Look for red error messages
   - Share the error message for help

2. **Verify backend is responding:**
   - Open `http://localhost:3001/api/branding` in browser
   - You should see JSON data with your settings

3. **Try a simple test:**
   - Set background to a solid color URL: `https://via.placeholder.com/1920x1080/ff0000/ff0000`
   - If this works, the issue is with your image file

4. **Check file permissions:**
   - Make sure the `backend/uploads` folder exists
   - Check that uploaded files have read permissions

---

## 📞 Need More Help?

If you're still having issues:
1. Check the browser console for errors
2. Verify the backend logs for any errors
3. Make sure both servers are running
4. Try uploading a different image
5. Test with a simple gradient first (no image)

---

## ✨ Success!

Once you see your background:
- It will appear on all pages (homepage, albums, featured)
- It will persist across browser sessions
- It will work in both light and dark modes
- It will be visible to all visitors

Enjoy your customized background! 🎉

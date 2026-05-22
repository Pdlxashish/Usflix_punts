# Mobile Responsiveness - Quick Reference Card

## 🎯 Quick Checklist for New Components

### ✅ Essential Mobile Patterns

```jsx
// 1. Responsive Text Sizing
<h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl">

// 2. Responsive Spacing
<div className="px-4 sm:px-6 lg:px-12">
<div className="py-4 sm:py-6 md:py-8">

// 3. Responsive Layout (Stack on Mobile)
<div className="flex flex-col sm:flex-row gap-4">

// 4. Responsive Grid
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

// 5. Touch-Friendly Buttons
<button className="min-h-[44px] min-w-[44px] px-6 py-3">

// 6. Hide/Show on Mobile
<div className="hidden md:block">Desktop Only</div>
<div className="block md:hidden">Mobile Only</div>

// 7. Responsive Images
<img 
  src={src}
  alt={alt}
  className="w-full h-auto object-cover"
  loading="lazy"
/>
```

## 📱 Common Breakpoints

```jsx
// Tailwind Breakpoints (Mobile First)
sm:  640px  // Small phones and up
md:  768px  // Tablets and up
lg:  1024px // Laptops and up
xl:  1280px // Desktops and up
2xl: 1536px // Large desktops and up

// Usage Examples
className="text-sm sm:text-base md:text-lg lg:text-xl"
className="p-4 md:p-6 lg:p-8"
className="w-full md:w-1/2 lg:w-1/3"
```

## 🎨 Responsive Patterns

### Stacking Pattern
```jsx
// Desktop: Side by side | Mobile: Stacked
<div className="flex flex-col md:flex-row gap-4">
  <div className="flex-1">Left</div>
  <div className="flex-1">Right</div>
</div>
```

### Grid Pattern
```jsx
// Mobile: 2 cols | Tablet: 3 cols | Desktop: 4 cols
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Container Pattern
```jsx
// Responsive container with max width
<div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
  {children}
</div>
```

### Button Group Pattern
```jsx
// Desktop: Horizontal | Mobile: Vertical
<div className="flex flex-col sm:flex-row gap-3">
  <button className="w-full sm:w-auto">Primary</button>
  <button className="w-full sm:w-auto">Secondary</button>
</div>
```

## 🔧 Utility Classes

### Custom Mobile Classes
```css
.hide-mobile          /* Hide on mobile */
.show-mobile          /* Show only on mobile */
.show-mobile-flex     /* Flex display on mobile */
.mobile-mt-4          /* Mobile margin-top */
.mobile-px-4          /* Mobile horizontal padding */
```

### Safe Area Classes
```css
.safe-area-top        /* iOS safe area top */
.safe-area-bottom     /* iOS safe area bottom */
.safe-area-left       /* iOS safe area left */
.safe-area-right      /* iOS safe area right */
```

## 📐 Touch Target Sizes

```jsx
// Minimum touch target: 44x44px (iOS guideline)
<button className="min-h-[44px] min-w-[44px]">

// Recommended touch target: 48x48px (Material Design)
<button className="min-h-[48px] min-w-[48px]">

// Icon buttons
<button className="p-3">  {/* 12px padding + 24px icon = 48px */}
  <Icon className="h-6 w-6" />
</button>
```

## 🖼️ Responsive Images

### Basic Responsive Image
```jsx
<img 
  src={src}
  alt={alt}
  className="w-full h-auto"
  loading="lazy"
  decoding="async"
/>
```

### Image with Object Fit
```jsx
<img 
  src={src}
  alt={alt}
  className="w-full h-64 object-cover rounded-lg"
  loading="lazy"
/>
```

### Responsive Background Image
```jsx
<div 
  className="h-64 sm:h-80 md:h-96 bg-cover bg-center"
  style={{ backgroundImage: `url(${src})` }}
/>
```

## 📝 Form Inputs

### Mobile-Friendly Input
```jsx
<input
  type="text"
  className="w-full px-4 py-3 text-base rounded-md"
  style={{ fontSize: '16px' }} // Prevents iOS zoom
/>
```

### Responsive Form Layout
```jsx
<form className="space-y-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <input className="w-full" />
    <input className="w-full" />
  </div>
  <button className="w-full md:w-auto">Submit</button>
</form>
```

## 🎭 Modal/Dialog Patterns

### Mobile-Friendly Modal
```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div className="bg-card rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
    <div className="p-4 sm:p-6">
      {content}
    </div>
  </div>
</div>
```

### Full-Screen Mobile Modal
```jsx
<div className="fixed inset-0 z-50 md:flex md:items-center md:justify-center md:p-4">
  <div className="h-full w-full md:h-auto md:max-w-2xl md:rounded-lg bg-card">
    {content}
  </div>
</div>
```

## 🎬 Video Player Mobile

### Responsive Video Container
```jsx
<div className="relative w-full aspect-video">
  <video 
    className="absolute inset-0 w-full h-full object-cover"
    playsInline  // Important for iOS
    controls
  />
</div>
```

## 🧭 Navigation Patterns

### Mobile Menu
```jsx
// Hamburger Button
<button 
  className="md:hidden p-2"
  onClick={() => setMenuOpen(!menuOpen)}
>
  {menuOpen ? <X /> : <Menu />}
</button>

// Mobile Menu Drawer
<nav className={`
  fixed top-0 right-0 bottom-0 w-64 bg-card
  transform transition-transform duration-300
  ${menuOpen ? 'translate-x-0' : 'translate-x-full'}
  md:hidden
`}>
  {links}
</nav>
```

## 🎨 Typography Scale

```jsx
// Heading Scales
<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
<h2 className="text-3xl sm:text-4xl md:text-5xl">
<h3 className="text-2xl sm:text-3xl md:text-4xl">
<h4 className="text-xl sm:text-2xl md:text-3xl">

// Body Text
<p className="text-sm sm:text-base md:text-lg">

// Small Text
<span className="text-xs sm:text-sm">
```

## ⚡ Performance Tips

```jsx
// 1. Lazy Load Images
<img loading="lazy" decoding="async" />

// 2. Reduce Animations on Mobile
<div className="transition-transform duration-300 md:duration-500">

// 3. Conditional Rendering for Mobile
{isMobile ? <MobileComponent /> : <DesktopComponent />}

// 4. Use CSS containment
<div className="contain-layout contain-paint">
```

## 🐛 Common Issues & Fixes

### Issue: iOS Input Zoom
```jsx
// ❌ Bad (causes zoom)
<input style={{ fontSize: '14px' }} />

// ✅ Good (prevents zoom)
<input style={{ fontSize: '16px' }} />
```

### Issue: Horizontal Scroll
```css
/* ✅ Fix */
html, body {
  overflow-x: hidden;
}
```

### Issue: Touch Highlight
```css
/* ✅ Remove unwanted highlight */
* {
  -webkit-tap-highlight-color: transparent;
}
```

### Issue: Safe Area on iOS
```jsx
// ✅ Use safe area insets
<div className="pb-safe-area-bottom">
```

## 📱 Testing Commands

```bash
# Test on different viewports
# Chrome DevTools: Cmd+Shift+M (Mac) or Ctrl+Shift+M (Windows)

# Common test sizes:
# iPhone SE:        375 x 667
# iPhone 12/13/14:  390 x 844
# iPhone 14 Pro Max: 430 x 932
# iPad Mini:        768 x 1024
# iPad Pro:         1024 x 1366
```

## 🎯 Quick Wins

1. **Always use mobile-first approach**
2. **Test on real devices, not just emulators**
3. **Ensure 44x44px minimum touch targets**
4. **Use 16px font size for inputs (prevents iOS zoom)**
5. **Add `playsInline` to videos for iOS**
6. **Use `loading="lazy"` for images**
7. **Test in both portrait and landscape**
8. **Check safe area insets on iOS**

## 📚 Resources

- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Material Design Touch Targets](https://material.io/design/usability/accessibility.html)
- [MDN Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)

---

**Keep this card handy when building new components!** 🚀

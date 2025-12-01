# Pay Day Styles Documentation

## Overview
This CSS file provides the complete styling for the Pay Day sports gambling web application, featuring a modern gradient design, responsive layout, and interactive UI components.

## Key Design Elements

### 1. Color Scheme & Background
```css
body {
    background: linear-gradient(135deg, #ff8c42 0%, #ff6b1a 100%);
}
```
- **Primary gradient**: Orange (#ff8c42) to darker orange (#ff6b1a) at 135° angle
- **Brand color**: #ff6b1a (used for buttons, headings, and accents)
- Creates a vibrant, energetic feel appropriate for sports gambling

### 2. Navigation Bar Structure
```css
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 40px;
}
```
- **Three-section layout**: Logo (left), navigation tabs (center), action buttons (right)
- Uses flexbox for responsive alignment
- Navigation links have hover states with semi-transparent white backgrounds

### 3. Button System
The design implements three button variants:

#### Primary Button (`.btn-primary`)
```css
.btn-primary {
    background-color: white;
    color: #ff6b1a;
}
```
- White background with orange text
- Used for main CTAs (Sign up, Submit forms)
- Hover effect: slight gray tint + upward translation

#### Secondary Button (`.btn-secondary`)
```css
.btn-secondary {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
}
```
- Semi-transparent white background
- Used for less prominent actions (Log in, Cancel)

#### Secondary Outline (`.btn-secondary-outline`)
```css
.btn-secondary-outline {
    background-color: transparent;
    color: white;
    border: 2px solid white;
}
```
- Transparent with white border
- Used for "See how it works" button

### 4. Hero Section Layout
```css
.hero-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
}
```
- **CSS Grid**: Two equal columns for text and image
- **Typography**: 64px bold title for maximum impact
- **Spacing**: 80px gap between content and visual elements

### 5. Hero Image Styling
```css
.hero-composite {
    width: 360px;
    height: auto;
    transform: rotate(12deg);
    filter: drop-shadow(0 24px 36px rgba(0,0,0,0.35));
}
```
- **12° rotation**: Creates dynamic, playful appearance
- **Drop shadow**: Adds depth and makes image pop from gradient background
- The programmatic card stack (`.card-stack`) is hidden when using composite image

### 6. Card Component (Player Cards)
```css
.card-front {
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    padding: 20px;
    border-radius: 20px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}
```
- **Purple gradient**: Distinguishes cards from main orange theme
- **Rounded corners**: 20px border-radius for modern look
- **Deep shadow**: Creates floating effect
- Contains player photo, name, game info, and action buttons

### 7. League Logos Styling
```css
.league-logo {
    filter: grayscale(1) brightness(0) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}
```
- **Grayscale + brightness(0)**: Converts all logos to black silhouettes
- Creates visual consistency across different league brands
- Hover effect: Lifts logo up 5px with shadow

### 8. Responsive Design
```css
@media (max-width: 768px) {
    .hero-content {
        grid-template-columns: 1fr;
        text-align: center;
    }
    .hero-title {
        font-size: 48px;
    }
}
```
**Mobile breakpoint at 768px:**
- Navigation stacks vertically
- Hero grid becomes single column
- Title size reduces from 64px to 48px
- League logos scale down to 60px height
- Composite image scales to 70% width with max 320px

### 9. Interactive Elements
```css
.action-btn:hover {
    transform: translateY(-2px);
}
```
- All buttons and interactive elements use `translateY(-2px)` on hover
- Creates consistent "lift" effect across the interface
- Smooth transitions with `transition: all 0.3s ease`

### 10. Spacing & Layout System
- **Container max-width**: 1200px for hero and leagues sections
- **Section padding**: 60-80px vertical, 40px horizontal
- **Button padding**: 10-15px vertical, 20-30px horizontal
- **Border radius**: Consistent 25px for buttons, 20px for cards

## Design Principles Applied

1. **Consistency**: All interactive elements share similar hover states and transitions
2. **Hierarchy**: Clear visual distinction between primary and secondary actions
3. **Whitespace**: Generous padding and gaps prevent cluttered appearance
4. **Accessibility**: High contrast between text and backgrounds
5. **Responsiveness**: Mobile-first approach with tablet/desktop enhancements

## Color Palette Reference
- **Primary Orange**: #ff6b1a
- **Light Orange**: #ff8c42
- **Purple Gradient**: #8b5cf6 → #6d28d9
- **Blue Gradient**: #4a9eff → #007bff
- **White**: #ffffff
- **Semi-transparent white**: rgba(255, 255, 255, 0.1-0.3)

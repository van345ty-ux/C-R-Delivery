# Implementation Plan - Redesign do Cardápio Online

## Phase 1: Global Styles and Design System

- [x] 1. Update global CSS with minimalist design system






  - [x] 1.1 Remove festive animations and complex gradients from index.css

    - Remove festive-specific animations (blink, swing, snowfall)
    - Remove festive gradient classes (festive-bg-gradient, festive-border)
    - Remove Christmas and Easter-related animation keyframes
    - Keep only essential animations (fadeIn, scaleIn, pulseFade for store status)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3_
  
  - [x] 1.2 Add skeleton loader styles and card hover transitions


    - Implement skeleton loader animation with gray gradient
    - Add card-hover utility class with smooth transform and shadow transitions
    - Ensure transitions are 0.2s ease for consistency
    - _Requirements: 7.1, 7.5_
  
  - [x] 1.3 Simplify scrollbar styling to match minimalist palette


    - Update scrollbar colors to use only red-600, red-700, and gray-100
    - Ensure scrollbar styling is consistent across components
    - _Requirements: 1.1, 1.2, 1.3_

## Phase 2: Hero Section Redesign

- [x] 2. Refactor Hero Section in Menu.tsx





  - [x] 2.1 Update hero height to be responsive (250px mobile, 350px desktop)


    - Change from fixed h-48 (192px) to responsive heights
    - Use Tailwind breakpoints: h-[250px] md:h-[350px]
    - _Requirements: 4.1, 4.4_
  
  - [x] 2.2 Simplify overlay and remove complex gradients


    - Replace gradient background with simple dark overlay (bg-black/40)
    - Remove festive border and decorations from hero
    - Maintain image as background with proper object-cover
    - _Requirements: 1.1, 1.2, 4.3_
  
  - [x] 2.3 Optimize hero image loading


    - Add loading="lazy" attribute to hero image
    - Ensure proper aspect ratio is maintained
    - _Requirements: 7.2, 7.3, 7.4_
  
  - [x] 2.4 Redesign store status badge with minimalist style


    - Simplify badge styling to use only bg-green-100/bg-red-100
    - Ensure badge remains visible with proper z-index
    - Keep pulse animation for "Atendendo" status only
    - _Requirements: 1.1, 1.2, 1.3, 4.2_

## Phase 3: Product Card Redesign

- [x] 3. Refactor ProductCard.tsx to vertical layout





  - [x] 3.1 Change card layout from horizontal to vertical


    - Move image to top of card with full width
    - Stack product name, description, price, and button vertically
    - Update flex direction and spacing accordingly
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 3.2 Implement 1:1 aspect ratio for product images


    - Use aspect-square utility class for images
    - Ensure object-cover maintains image quality
    - Add rounded-t-lg to image (rounded top only)
    - _Requirements: 3.1, 7.2_
  


  - [x] 3.3 Update card styling with subtle shadows and minimalist colors

    - Base state: shadow-sm, border-gray-200 for regular products
    - Promotion state: bg-red-50, border-red-300 for promotions
    - Hover state: shadow-md with translateY(-2px) transform
    - Use rounded-lg (8px) for card borders
    - _Requirements: 1.1, 1.2, 1.3, 3.3, 3.4_


  

  - [x] 3.4 Simplify hover effects and remove excessive zoom

    - Remove or reduce image zoom effect (scale-200 is too much)
    - Implement subtle card elevation on hover (translateY(-2px))
    - Ensure hover effects only apply on desktop (lg: breakpoint)

    - _Requirements: 3.4, 7.5_

  
  - [x] 3.5 Update price and button styling


    - Price: text-red-600 font-bold text-lg
    - Button: bg-red-600 hover:bg-red-700 with rounded-full
    - Ensure button has proper touch target size (44x44px minimum)
    - _Requirements: 1.2, 2.4, 3.5_
  
  - [x] 3.6 Add skeleton loader component for product cards


    - Create ProductCardSkeleton component with gray animated blocks
    - Display skeleton during loading state
    - Match skeleton structure to actual card layout
    - _Requirements: 7.1, 7.4_

## Phase 4: Category Filter Simplification

- [x] 4. Simplify category filter buttons in Menu.tsx





  - [x] 4.1 Unify category button styles (except Ovos de Sushi)


    - Active state: bg-red-600 text-white
    - Inactive state: bg-gray-100 text-gray-700 hover:bg-gray-200
    - Use rounded-full for all buttons
    - Remove festive gradient styles
    - _Requirements: 1.1, 1.2, 5.3, 5.5_
  
  - [x] 4.2 Maintain special styling for "Ovos de Sushi" category


    - Keep larger size and pulse animation for this category
    - Simplify animation to pulse between white/red only
    - Ensure it stands out while remaining minimalist
    - _Requirements: 5.3, 5.5_
  
  - [x] 4.3 Improve touch targets for mobile


    - Ensure all category buttons have minimum 44x44px touch area
    - Increase padding if necessary: py-3 px-4
    - Test horizontal scroll behavior on mobile
    - _Requirements: 2.4, 5.1, 5.2_
  
  - [x] 4.4 Add smooth transitions to category buttons


    - Implement transition-all duration-300 for state changes
    - Ensure smooth scroll behavior when switching categories
    - _Requirements: 5.4_

## Phase 5: Search Input Redesign

- [x] 5. Update search input styling in Menu.tsx






  - [x] 5.1 Simplify search input border and focus states

    - Border: border-gray-200
    - Focus: focus:ring-2 focus:ring-red-500 focus:border-red-500
    - Placeholder: text-gray-400
    - _Requirements: 1.1, 1.2, 1.3_
  

  - [x] 5.2 Increase padding for better mobile touch targets

    - Update to py-3 px-4 (currently py-2)
    - Ensure input height meets 44px minimum
    - _Requirements: 2.4_

## Phase 6: Grid Layout Optimization

- [x] 6. Optimize product grid layouts in Menu.tsx






  - [x] 6.1 Update promotions grid to responsive columns

    - Mobile (< 640px): grid-cols-1
    - Tablet (640px - 1024px): grid-cols-2
    - Desktop (> 1024px): grid-cols-3
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 6.2 Update regular products grid to 4 columns on desktop


    - Mobile (< 640px): grid-cols-1
    - Tablet (640px - 1024px): grid-cols-3
    - Desktop (> 1024px): grid-cols-4 (reduced from 5)
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 6.3 Update grid gap spacing


    - Mobile: gap-4 (16px)
    - Desktop: gap-6 (24px)
    - _Requirements: 6.1_

## Phase 7: Highlights Section Simplification

- [x] 7. Simplify HighlightCard.tsx styling





  - [x] 7.1 Update highlight card colors to match minimalist palette


    - Ensure border colors use red, black, or white only
    - Simplify shadow styling
    - _Requirements: 1.1, 1.2, 1.3_
  

  - [x] 7.2 Optimize highlight card images





    - Add loading="lazy" to images
    - Ensure proper aspect ratio (1:1)
    - _Requirements: 7.2, 7.3_

## Phase 8: Remove Festive Mode Features

- [x] 8. Clean up festive mode remnants





  - [x] 8.1 Remove festive mode conditional rendering from Menu.tsx


    - Remove ChristmasHeroDecorations component usage
    - Remove festive-border class from hero section
    - Remove festive mode checks from category buttons
    - _Requirements: 1.1, 1.2_
  
  - [x] 8.2 Remove festive decoration components (optional cleanup)


    - Consider removing or archiving FestiveDecorations.tsx
    - Remove SnowEffect.tsx and EasterBunnyPeek.tsx if not needed
    - Clean up unused imports in App.tsx
    - _Requirements: 1.1, 1.2_

## Phase 9: Typography and Spacing Consistency
-

- [x] 9. Ensure consistent typography and spacing





  - [x] 9.1 Audit and standardize font sizes across components

    - Headings: text-xl or text-2xl
    - Body: text-base
    - Small: text-sm
    - Ensure consistent font weights
    - _Requirements: 6.2, 6.3, 6.4_
  
  - [x] 9.2 Audit and standardize spacing scale


    - Use consistent spacing: p-3, p-4, mb-2, mb-4, gap-4, gap-6
    - Ensure spacing follows 4px, 8px, 16px, 24px, 32px, 48px scale
    - _Requirements: 6.1, 6.3_

## Phase 10: Accessibility Improvements
-

- [x] 10. Enhance accessibility features






  - [x] 10.1 Add ARIA labels to interactive elements


    - Add aria-label to "Add to cart" buttons with product name
    - Add role="status" and aria-live="polite" to loading states
    - _Requirements: 8.2, 8.4_
  
  - [x] 10.2 Ensure keyboard navigation and focus indicators


    - Verify all interactive elements are keyboard accessible
    - Ensure focus:ring-2 focus:ring-red-500 focus:ring-offset-2 on all buttons
    - Test tab order is logical
    - _Requirements: 8.1, 8.3_
  
  - [x] 10.3 Verify color contrast ratios





    - Test all text/background combinations with contrast checker
    - Ensure WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)
    - _Requirements: 1.5, 8.5_

## Phase 11: Performance Optimization


- [x] 11. Implement performance optimizations



  - [x] 11.1 Add lazy loading to all product images


    - Add loading="lazy" attribute to ProductCard images
    - Ensure images have proper width/height attributes
    - _Requirements: 7.2, 7.3_
  
  - [x] 11.2 Implement skeleton loaders during data fetch


    - Show ProductCardSkeleton components while loading
    - Replace "Carregando cardápio..." text with skeleton grid
    - _Requirements: 7.1, 7.4_
  
  - [x] 11.3 Test and optimize performance metrics


    - Run Lighthouse audit and aim for > 90 performance score
    - Verify First Contentful Paint < 2 seconds
    - Test scrolling performance (60fps)
    - _Requirements: 7.4, 7.5_

## Phase 12: Final Polish and Testing

- [x] 12. Final testing and adjustments





  - [x] 12.1 Test responsive design across all breakpoints


    - Test on mobile (375px, 390px)
    - Test on tablet (768px)
    - Test on desktop (1440px)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  

  - [x] 12.2 Test all interactive states

    - Hover states on desktop
    - Active states on mobile
    - Disabled states (isMercadoPagoReturnFlow)
    - _Requirements: 3.4, 3.5_
  

  - [x] 12.3 Cross-browser testing

    - Test on Chrome, Firefox, Safari, Edge
    - Verify all styles render correctly
    - Test touch interactions on mobile browsers
    - _Requirements: 2.5, 7.5_
  

  - [x] 12.4 Clean up unused code and comments

    - Remove commented-out code
    - Remove unused imports
    - Add comments for complex logic
    - _Requirements: All_

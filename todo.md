# PinRanks Development TODO

## Mobile Layout Issues - Matchup View

### Current Status
- ✅ Fixed basic mobile layout issues with matchup cards
- ✅ Implemented iPhone-specific height adjustments using `@supports (-webkit-touch-callout: none)`
- ✅ Cards now fit properly on iPhone and Android test devices

### Known Limitations & Future Work Needed

#### 1. **Device-Specific Testing Required**
- Current solution uses iOS-specific CSS that may not work for all mobile browsers
- Need to test on various device sizes and orientations
- Different Android devices may have varying viewport behaviors
- Other mobile browsers (Firefox Mobile, Samsung Internet, etc.) may behave differently

#### 2. **Robust Mobile Solution Needed**
- Current approach uses fixed viewport calculations that may not scale well
- Consider implementing a more dynamic solution that:
  - Uses JavaScript to detect actual viewport dimensions
  - Adapts to different screen sizes and orientations
  - Handles various mobile browser quirks
  - Provides fallbacks for unsupported CSS features

#### 3. **Testing Checklist for Production Release**
- [ ] Test on various iPhone models (SE, 12, 13, 14, 15 series)
- [ ] Test on various Android devices (different manufacturers, screen sizes)
- [ ] Test in different mobile browsers (Safari, Chrome, Firefox, Samsung Internet)
- [ ] Test in both portrait and landscape orientations
- [ ] Test with different zoom levels
- [ ] Test with different accessibility settings
- [ ] Test on tablets (iPad, Android tablets)

#### 4. **Potential Solutions to Investigate**
- CSS Container Queries for more responsive design
- JavaScript-based viewport height detection
- CSS `env()` variables for safe area handling
- More sophisticated flexbox/grid layouts
- Progressive enhancement approach

#### 5. **Priority Level**
**HIGH** - This affects core user experience on mobile devices

#### 6. **Estimated Effort**
- Testing: 2-3 days across multiple devices
- Implementation: 1-2 days for robust solution
- Total: 3-5 days

---

*Last Updated: [Current Date]*
*Status: Working solution in place, comprehensive testing needed before production*

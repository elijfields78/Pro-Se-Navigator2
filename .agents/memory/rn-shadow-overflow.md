---
name: RN shadow + overflow conflict
description: In React Native, overflow:hidden on the same View as shadow*/elevation clips the iOS shadow entirely. Patterns to fix it.
---

## The Rule

In React Native (iOS), `overflow: 'hidden'` on a View that also carries `shadowColor / shadowOffset / shadowOpacity / shadowRadius` **clips the shadow completely**. The view appears flat even though shadow styles are set.

**Why:** iOS clips the shadow to the View's bounds before compositing when overflow:hidden is active.

**How to apply:** Any card, menu, or container that needs both rounded-corner clipping AND an elevation shadow must use one of these patterns:

### Pattern A — Split Views (always correct)
```tsx
{/* outer: shadow only, no overflow */}
<View style={{ borderRadius: 16, shadowColor: '#1C1B18', ... elevation: 3 }}>
  {/* inner: clipping only, no shadow */}
  <View style={{ borderRadius: 16, overflow: 'hidden' }}>
    {children}
  </View>
</View>
```

### Pattern B — Drop overflow:hidden (safe when children have no explicit backgrounds)
If child views only use `opacity` for press feedback (not `backgroundColor`), you can simply omit `overflow: 'hidden'` from the shadow container. Content won't visually bleed at corners because nothing has a background to show.

**Used in:** `settings.tsx` menuCard, `usage.tsx` featureCard — both use opacity-only press states, so Pattern B is fine there.

### Note on web renderer warning
`shadow*` props show a deprecation warning in the Expo **web** renderer ("use boxShadow instead"). This is expected and harmless — `shadow*` are the correct native props for iOS/Android targets.

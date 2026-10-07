/*
 * Port of androidx.compose.material3.carousel (Arrangement.kt, Keylines.kt, KeylineList.kt,
 * Strategy.kt, the carouselItem modifier and KeylineSnapPosition) — the keyline model that sizes,
 * masks and pins carousel items as they scroll. Kept structurally close to the Kotlin so it can be
 * diffed against upstream.
 */
export type { Arrangement } from './arrangement.ts';
export type { Keyline, KeylineList } from './keylineList.ts';
export {
  createCenterAlignedKeylineList,
  createLeftAlignedKeylineList,
  heroKeylineList,
  MAX_SMALL_ITEM_SIZE,
  MIN_SMALL_ITEM_SIZE,
  multiBrowseKeylineList,
  uncontainedKeylineList,
} from './keylineLayouts.ts';
export { itemPlacement, maxScrollOffset, Strategy } from './strategy.ts';

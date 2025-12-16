# Temple March - 2D Sprite Asset Sources

## Recommended FREE Asset Combination

| Category | Asset | Source | License |
|----------|-------|--------|---------|
| **Vader/Anakin** | Fantasy Knight (dark variant) | [aamatniekss - itch.io](https://aamatniekss.itch.io/fantasy-knight-free-pixelart-animated-character) | Free commercial |
| **Clone Troopers** | Sci-Fi Soldiers Pack | [JaydenIrwin - itch.io](https://jaydenirwin.itch.io/sci-fi-soldiers) | CC0 |
| **Jedi Defenders** | Free Animated Mage | itch.io | Free |
| **Temple Guards** | Sci-Fi Antagonists Pack | [CraftPix](https://craftpix.net/freebies/free-sci-fi-antagonists-pixel-character-pack/) | Royalty-free |
| **Lightsaber Glow** | [LPC] Glow Sword | [OpenGameArt](https://opengameart.org/content/lpc-glow-sword) | CC-BY-SA 3.0 |
| **Slash Effects** | Weapon Slash Effect | [OpenGameArt](https://opengameart.org/content/weapon-slash-effect) | CC0 |
| **Temple Tileset** | Sci-fi Interior Tiles | [OpenGameArt](https://opengameart.org/content/sci-fi-interior-tiles) | CC0 |
| **City Tileset** | Free Cyberpunk Backgrounds | itch.io | Free |
| **UI Elements** | Sci Fi Game UI FREE | SunGraphica - itch.io | Free |

**Total Cost: $0.00**

---

## Character Details

### Fantasy Knight (Vader/Anakin)
- **Resolution**: 38x20 pixels (character), 80x120 canvas
- **18 Animations**:
  - Idle (10 frames), Run (10 frames), Turn Around (3 frames)
  - Attack 1 (4 frames), Attack 2 (6 frames)
  - Crouch walk (8 frames), Crouch Attack (4 frames)
  - Jump (3+2 frames), Fall (3+2 frames), Roll (12 frames)
  - Dash (2 frames), Death (10 frames), Hit (1 frame)
  - Wall Hang, Wall Climb (7 frames), Wall Slide (3 frames)
- **Color Variations**: Dark/muted and light/colorful versions

### Sci-Fi Soldiers (Clone Troopers)
- **Resolution**: Various (32x32, 80x32)
- **Animations**: Idle, Death, Walking, Aim, Fire

### CraftPix Soldiers (Alternative)
- **10 Animations**: Shot (2 types), attack, dead, explosion, grenade, hurt, idle, run, recharge, walk
- **3 Soldier variations**

---

## Effects Details

### [LPC] Glow Sword
- **Resolution**: 192x192 pixel tiles
- **Colors**: Red and Blue glowing variants
- **Includes**: Slash animations

### Weapon Slash Effect
- **5 Different animated slash effects**
- **Colors**: Classic, Purple, Blue, Fire

---

## Tileset Details

### Sci-fi Interior Tiles
- **Resolution**: 32x32 pixels
- **12,343+ downloads** (well-tested)
- **Style**: Cartoonish sci-fi interior

### Alternative: Free Sci-Fi Tileset (16x16)
- [ZofiaBosak - itch.io](https://zofiab.itch.io/sci-fi-asset-pack-free)
- Modern, clean aesthetic with animated elements

---

## Legal Notes

1. All recommended assets use generic sci-fi/fantasy designs
2. Avoid explicit Star Wars branding
3. Add fan game disclaimer to project

### Attribution Requirements
- **CC0**: No attribution required
- **CC-BY-SA**: Credit "Buch" for sci-fi interior tiles
- **CraftPix**: Commercial use OK, check specific terms

---

## Phaser.js Integration

```javascript
// Example animation setup
this.anims.create({
    key: 'vader-walk',
    frames: this.anims.generateFrameNumbers('vader', { start: 0, end: 9 }),
    frameRate: 10,
    repeat: -1
});
```

**Recommended Tools**:
- TexturePacker - Create optimized sprite atlases
- Aseprite - Edit and reorganize sprite sheets
- ShoeBox (free) - Convert sprites to Phaser-compatible formats

/**
 * Built-in walking characters: a base body + part overlays + role colors.
 * Every character's view id is builtin-<theme>-<name>.
 */
import type { View } from '../types'
import { BODIES } from './bodies'
import { characterView, customCharacterView, type CharacterDef } from './compose'
import { GHOST } from './ghost'
import * as P from './parts'

const same = (key: string, label: string, color: number) => ({ key, label, color })

export const CHARACTER_DEFS: CharacterDef[] = [
  // ------------------------------------------------------------ fantasy
  {
    name: 'adventurer',
    label: 'Adventurer',
    theme: 'fantasy',
    body: 'adult',
    parts: [P.tunicSkirt, P.boots, P.featherCap],
    roles: {
      h: { color: 6 },
      c: { label: 'Tunic', color: 1 },
      p: { label: 'Leggings', color: 7 },
      f: { label: 'Boots', color: 6 },
      k: { label: 'Cap', color: 4 },
    },
  },
  {
    name: 'knight',
    label: 'Knight',
    theme: 'fantasy',
    body: 'adult',
    parts: [P.surcoat, P.boots, P.knightHelm],
    roles: {
      c: same('armor', 'Armor', 7),
      p: same('mail', 'Mail', 8),
      f: { label: 'Boots', color: 0 },
      t: { color: 6 },
    },
  },
  {
    name: 'wizard',
    label: 'Wizard',
    theme: 'fantasy',
    body: 'adult',
    parts: [P.robe, P.longHair, P.longBeard, P.wizardHat],
    roles: {
      h: { color: 15 },
      c: same('robe', 'Robe', 5),
      t: { label: 'Sash', color: 14 },
      f: { color: 8 },
      k: { color: 1 },
    },
  },
  {
    name: 'gnome',
    label: 'Gnome',
    theme: 'fantasy',
    body: 'short',
    parts: [P.boots, P.longBeard, P.gnomeHat],
    roles: {
      h: { color: 15 },
      c: { label: 'Tunic', color: 2 },
      p: { color: 6 },
      f: { label: 'Boots', color: 0 },
      t: { color: 0 },
      k: { color: 4 },
    },
  },
  // ------------------------------------------------------------ sci-fi
  {
    name: 'janitor',
    label: 'Space janitor',
    theme: 'scifi',
    body: 'adult',
    parts: [P.coverallSeams, P.badge],
    roles: {
      a: { key: 'patch', label: 'Name patch', color: 9 },
      h: { color: 14 },
      c: same('coveralls', 'Coveralls', 15),
      p: same('coveralls', 'Coveralls', 15),
      t: { label: 'Tool belt', color: 8 },
      f: { color: 0 },
    },
  },
  {
    name: 'alien',
    label: 'Alien',
    theme: 'scifi',
    body: 'short',
    parts: [P.boots, P.alienHead],
    roles: {
      s: { color: 10 },
      c: same('suit', 'Suit', 13),
      p: same('suit', 'Suit', 13),
      t: { color: 14 },
      f: { label: 'Boots', color: 5 },
    },
  },
  {
    name: 'robot',
    label: 'Robot',
    theme: 'scifi',
    body: 'short',
    parts: [P.robotHead, P.chestLight],
    roles: {
      c: same('metal', 'Metal', 7),
      r: same('joints', 'Limbs', 0),
      p: same('joints', 'Limbs', 0),
      s: same('joints', 'Limbs', 0),
      t: same('joints', 'Limbs', 0),
      f: same('metal', 'Metal', 7),
    },
  },
  // ------------------------------------------------------------ modern
  {
    name: 'cop',
    label: 'Police officer',
    theme: 'modern',
    body: 'adult',
    parts: [P.badge, P.policeCap],
    roles: {
      c: same('shirt', 'Shirt', 9),
      p: same('uniform', 'Uniform', 1),
      k: same('uniform', 'Uniform', 1),
      t: { color: 0 },
      f: { color: 0 },
    },
  },
  {
    name: 'leisure-suit',
    label: 'Leisure-suit guy',
    theme: 'modern',
    body: 'adult',
    parts: [P.balding, P.openCollar],
    roles: {
      c: same('suit', 'Suit', 15),
      p: same('suit', 'Suit', 15),
      t: same('suit', 'Suit', 15),
      f: { color: 0 },
      h: { color: 6 },
    },
  },
  {
    name: 'bartender',
    label: 'Bartender',
    theme: 'modern',
    body: 'adult',
    parts: [P.vestAndBowtie, P.mustache],
    roles: {
      c: { color: 15 },
      h: { color: 0 },
      p: { color: 0 },
      t: { color: 0 },
      f: { color: 0 },
    },
  },
  // ------------------------------------------------------------ spooky
  {
    name: 'skeleton',
    label: 'Skeleton',
    theme: 'spooky',
    body: 'adult',
    parts: [P.ribcage, P.skull],
    roles: Object.fromEntries(['s', 'h', 'c', 'r', 'p', 'f', 't'].map((ch) => [ch, same('bone', 'Bone', 15)])),
  },
  {
    name: 'vampire',
    label: 'Vampire',
    theme: 'spooky',
    body: 'adult',
    parts: [P.widowsPeak, P.shirtFront, P.cape],
    roles: {
      s: { color: 15 },
      e: { color: 4 },
      h: { color: 0 },
      c: same('suit', 'Suit', 0),
      p: same('suit', 'Suit', 0),
      t: same('suit', 'Suit', 0),
      f: { color: 0 },
    },
  },
]

export const CHARACTER_VIEWS: View[] = [
  ...CHARACTER_DEFS.map((d) => characterView(d, BODIES)),
  customCharacterView(GHOST),
]

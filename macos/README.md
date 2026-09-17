# SearchBuddy Views

Native macOS SwiftUI renderer. It does not call an LLM and does not use WebKit. Agents write JSON; this app decodes it and paints a window.

## Paths

Default files:

```
~/Library/Application Support/SearchBuddy/views/current.json
~/Library/Application Support/SearchBuddy/preferences.json
```

File → Open and drag-drop also load a view JSON. Preferences always come from the default preferences path.

## Load the sample

```bash
mkdir -p "$HOME/Library/Application Support/SearchBuddy/views"
cp Fixtures/current.json "$HOME/Library/Application Support/SearchBuddy/views/current.json"
cp Fixtures/preferences.json "$HOME/Library/Application Support/SearchBuddy/preferences.json"
```

Then open `macos/SearchBuddyViews.xcodeproj` and run the SearchBuddy Views scheme. Replacing either JSON file updates the window without restarting.

Swap among Job Scout flavors the same way:

```bash
cp Fixtures/job-scout.companies.json "$HOME/Library/Application Support/SearchBuddy/views/current.json"
cp Fixtures/job-scout.opportunities.json "$HOME/Library/Application Support/SearchBuddy/views/current.json"
cp Fixtures/job-scout.people.json "$HOME/Library/Application Support/SearchBuddy/views/current.json"
```

The window reloads on write. The generic `Fixtures/current.json` sample still works.

## Schema

`current.json`:

```json
{
  "viewId": "string",
  "title": "string",
  "layout": "cards | table",
  "theme": { "accent": "#2563EB", "density": "comfortable | compact" },
  "fields": ["photo", "name", "bio", "priorities", "xURL", "company", "role"],
  "items": [
    {
      "id": "string",
      "name": "string",
      "photoURL": "string?",
      "bio": "string?",
      "priorities": ["string"],
      "xURL": "string?",
      "company": "string?",
      "role": "string?",
      "tags": ["string"],
      "fields": { "anyExtra": "string" }
    }
  ]
}
```

`preferences.json` is the same `theme` / `layout` / `fields` defaults.

Items share one Codable shape. Job Scout flavors add optional typed fields (`website`, `careersUrl`/`careers`, `linkedinUrl`/`linkedin`, `logoUrl`, `openRolesCount`, `source`, `title`, `location`, `status`, `applicationStatus`, `rank`, `why`, `url`, `email`, `relatedJobUrl`) plus the same `fields` dictionary.

## Preference merge

1. Kind defaults (generic built-in list, or the Job Scout field list for that `viewId`).
2. `preferences.json` fills any key still missing.
3. `current.json` wins when it sets a key.

Theme keys merge independently. A payload that sets `accent` but omits `density` keeps the preference (or built-in) density.

Only columns/slots listed in the resolved `fields` array are shown.

## Job Scout view kinds

Detected from a `viewId` prefix (`job-scout.companies`, `job-scout.opportunities`, `job-scout.people`) or from `fields` when the id is generic (`openRolesCount` / `careersUrl`+`website`; `applicationStatus` or `title`+`url`+`status`; `relatedJobUrl` or `email`+`linkedinUrl`+`photoUrl`).

### `job-scout.companies` — cards

Fields: `name`, `website`, `careersUrl`, `linkedinUrl`, `openRolesCount`, `source`

Optional `logoUrl`. Logo order: `logoUrl` → `https://logo.clearbit.com/{host}` from `website` (or `careersUrl`) → building placeholder.

`item.id` = `company:{slug}`

Cards show logo, name, an open-roles badge, and Website / Careers / LinkedIn buttons (hidden when null). Aliases `careers` and `linkedin` also bind.

Companies always render as cards, even if `preferences.json` asks for a table. That avoids the old one-column “Company | More” list.

### `job-scout.opportunities` — table (default) or cards

Fields: `title`, `company`, `location`, `status`, `applicationStatus`, `source`, `rank`, `why`, `url`

`item.id` = apply URL. `item.name` = `title` (title alone is enough to decode).

Status chips render `status` and `applicationStatus`. Missing `applicationStatus` is treated as `none`.

### `job-scout.people` — cards

Fields: `name`, `role`, `company`, `linkedinUrl`, `email`, `photoUrl`, `why`, `relatedJobUrl`

`item.id` = `person:linkedin:{slug}` or `person:email:{addr}`

Optional `fields.tier`: `hiring_manager` | `recruiter` | `peer` | `poster`

`photoUrl` null → placeholder. `email` null → “no email”. LinkedIn button only when `linkedinUrl` is present.

## Null and URL rules

JSON `null` or a missing key becomes a Swift `nil`. The UI shows “—”, “no email”, or a photo placeholder. The renderer never invents contact data.

`url`, `relatedJobUrl`, `linkedinUrl`, `careersUrl`, and `website` open with `NSWorkspace`.

## Run tests

```bash
xcodebuild -project macos/SearchBuddyViews.xcodeproj -scheme SearchBuddyViews \
  -destination 'platform=macOS,arch=arm64' \
  -derivedDataPath macos/DerivedData \
  test
```

# Instagram Unfollow Tracker

A React app that compares your Instagram followers and following exports to find accounts you follow that do not follow you back.

The comparison runs in your browser. No Instagram password or API key is required, and the app does not send your imported files to a server.

> Entering a username alone does not retrieve Instagram data. You must import your own Instagram JSON exports. The username is optional and is used to label the results and name the downloaded CSV.

## Features

- Compare followers and following lists automatically after importing both files.
- Search the results by username.
- Open an account's Instagram profile from the results.
- Export the complete list of non-mutual follows as CSV.
- Deduplicate usernames and compare them without case sensitivity.
- Read export entries containing usernames in `value`, `title`, or Instagram profile URLs, including `/_u/username` URLs.

## Run Locally

### Requirements

- Node.js 22.12 or newer in the 22.x release line, or a newer Node.js version supported by Vite 7.
- npm, included with Node.js.
- A modern web browser.

### Setup

Open a terminal in the project folder and run:

```bash
npm ci
npm run dev
```

Open the local URL printed in the terminal, usually <http://127.0.0.1:5173/>. If that port is occupied, Vite may choose a different one.

Keep the terminal running while using the app. Press `Ctrl+C` to stop the server.

## How to Use

### 1. Export Your Instagram Data

Instagram's information export is available through Meta Accounts Center. Menu names may differ by device or change over time.

1. Open Instagram settings and go to **Accounts Center**.
2. Open **Your information and permissions** and look for **Export your information** or **Download your information**.
3. Select the Instagram account you want to check and choose an export to your device.
4. Choose specific information and select **Followers and following**, usually under **Connections**.
5. Choose **All time** for the date range and **JSON** for the file format.
6. Submit the request. When Instagram makes the download available, download and extract the ZIP archive.
7. Find `following.json` and `followers_1.json`. They are commonly inside a `connections/followers_and_following` folder; the folder layout can vary.

Meta explains the Accounts Center information controls in its [official guide to managing your information](https://about.fb.com/news/2023/10/manage-your-information-across-apps/).

Use followers and following files from the same account and export. An incomplete export can incorrectly mark followers as accounts that do not follow you back.

### 2. Import the Files

1. Start the app and open its local URL.
2. Optionally enter your Instagram username.
3. Under **Following**, click **Choose JSON** and select `following.json`.
4. Under **Followers**, click **Choose JSON** and select `followers_1.json`, or a combined followers file if your export is split into multiple files.
5. Once both files contain successfully parsed usernames, the results appear automatically.

The app accepts one file per input. Selecting another file replaces the previous selection; it does not add to it. Select the extracted JSON files, rather than the ZIP archive or HTML files.

### 3. Review and Export Results

- **Following** shows the number of unique usernames in your following file.
- **Followers** shows the number of unique usernames in your followers file.
- **Not following back** shows accounts present in your following file but absent from your followers file.
- Use **Search usernames** to filter the displayed list.
- Click a result to open that account's Instagram profile in a new tab.
- Click **Export CSV** to download the full results list. Search filters do not affect the CSV export.

For example, if you follow `alice`, `bob`, and `charlie`, but only `alice` and `charlie` follow you, the result is `bob`.

### Split Followers Files

If the export contains `followers_1.json`, `followers_2.json`, and more, all parts must be included for an accurate comparison. The current interface does not merge multiple uploads.

For standard follower files that each contain a top-level JSON array, you can combine them locally with Node.js. Put only the follower parts you want to combine in one folder, open a terminal there, and run:

```bash
node --input-type=module -e '
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const files = readdirSync(".").filter(name => /^followers_\d+\.json$/.test(name));
if (!files.length) throw new Error("No followers_N.json files found.");
const followers = files.flatMap(name => {
  const data = JSON.parse(readFileSync(name, "utf8"));
  if (!Array.isArray(data)) throw new Error(`${name} must contain a JSON array.`);
  return data;
});
writeFileSync("followers_combined.json", JSON.stringify(followers, null, 2));
console.log(`Combined ${files.length} files into followers_combined.json`);
'
```

Upload the resulting `followers_combined.json` under **Followers**. This command creates or replaces that combined file and leaves the numbered source files intact.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| A JSON parsing error appears | Extract the archive first and select a valid `.json` file. HTML exports are not supported. Request a new JSON export if needed. |
| "No usernames found in this file." appears | Check that you selected the followers or following file, rather than another file in the export. Empty lists are currently treated as an error. |
| Results say to upload both files | Both files must parse successfully and contain at least one username. Accounts with an empty followers or following list are not currently supported. |
| Someone who follows you appears in the results | Include every split followers file, use an all-time export, and confirm both lists belong to the same account and export. |
| Counts differ from Instagram | Counts reflect unique usernames in the imported files. The export may be incomplete or older than your current account state. |
| Export CSV is disabled | CSV export is enabled only after both lists load successfully and at least one non-mutual follow is found. |
| Vite reports an unsupported Node.js version | Check `node --version` and update to a supported version listed above. |

## Privacy and Limitations

Imported data is processed in browser memory. The app has no backend upload endpoint, analytics, or persistent storage for these lists. Refreshing or closing the page clears the loaded data; CSV files you download remain on your device. Opening a profile link navigates to Instagram.

Results reflect the imported export, not live Instagram activity. This app identifies non-mutual follows; it does not establish who previously followed you and later unfollowed you. It also does not unfollow accounts automatically.

Keep your export files and downloaded CSVs out of public repositories. This project is independent of Instagram and Meta.

## Production Build

```bash
npm run build
npm run preview
```

`build` generates the static site in `dist/`. `preview` serves that build locally for checking; it is not a production hosting service. Open the URL printed by the preview command.

## Project Structure

```text
src/main.jsx     React interface, JSON parsing, comparison, and CSV export
src/styles.css   App styling and responsive layouts
index.html       HTML entry point
package.json     Dependencies and npm scripts
```

Built with React, Vite, and Lucide React, with assistance from ChatGPT Codex.

## License

[MIT](LICENSE) - Copyright (c) 2026 Justin Yoon.

const { countWords, formatNumber, DICT_DIR } = require("./utils");
const fs = require("fs");
const path = require("path");

function getDictSizeInMB() {
  if (!fs.existsSync(DICT_DIR)) {
    return 0;
  }
  let totalSize = 0;
  const files = fs.readdirSync(DICT_DIR);
  files.forEach((file) => {
    if (file.endsWith(".json")) {
      const stats = fs.statSync(path.join(DICT_DIR, file));
      totalSize += stats.size;
    }
  });
  return (totalSize / (1024 * 1024)).toFixed(2);
}

function main() {
  try {
    console.log("Counting words and calculating size...");

    let fileCount = 0;
    if (fs.existsSync(DICT_DIR)) {
      fileCount = fs
        .readdirSync(DICT_DIR)
        .filter((file) => file.endsWith(".json")).length;
    }

    const totalWords = countWords();
    const sizeMB = getDictSizeInMB();

    console.log("-----------------------------");
    console.log(`Processed ${fileCount} dictionary files.`);
    console.log(`Total words in dictionary: ${formatNumber(totalWords)}`);
    console.log(`Total size: ${sizeMB} MB`);
    console.log("-----------------------------");

    // Update README.md
    const readmePath = path.join(__dirname, "../README.md");
    if (fs.existsSync(readmePath)) {
      let content = fs.readFileSync(readmePath, "utf-8");

      // Calculate "万" (ten thousands)
      const wanCount = Math.floor(totalWords / 10000);

      const newString = `内置 ${wanCount} 万+ 离线单词`;
      const regex = /内置\s*\d+\s*万\+\s*离线单词/;

      if (regex.test(content)) {
        const updatedContent = content.replace(regex, newString);
        fs.writeFileSync(readmePath, updatedContent, "utf-8");
        console.log(`Successfully updated README.md to: "${newString}"`);
      } else {
        console.log(
          "Could not find the word count pattern in README.md to update."
        );
      }
    } else {
      console.error("README.md not found at " + readmePath);
    }
  } catch (error) {
    console.error("Error counting words:", error);
  }
}

main();

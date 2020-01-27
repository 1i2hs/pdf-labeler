const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const cliProgress = require("cli-progress");
const _colors = require("colors");

// create new progress bar
const progressBar = new cliProgress.SingleBar({
  format:
    "페이지 라벨링중 |" +
    _colors.cyan("{bar}") +
    "| {percentage}% || {value}/{total} ",
  barCompleteChar: "\u2588",
  barIncompleteChar: "\u2591",
  hideCursor: true
});

function readInputFile(path) {
  try {
    return fs.readFileSync(path);
  } catch (error) {
    error.message =
      "input.pdf 파일이 존재하지 않습니다. 파일을 준비하고 다시 본 프로그램을 실행해주세요.";
    error.name = "InputFileUnavailableError";
    throw error;
  }
}

function readNameListFile(path) {
  try {
    return fs.readFileSync(path, "utf8");
  } catch (error) {
    error.message =
      "name_list.txt 파일이 존재하지 않습니다. 파일을 준비하고 다시 본 프로그램을 실행해주세요.";
    error.name = "NameListFileUnavailableError";
    throw error;
  }
}

function readFontFile(path) {
  try {
    return fs.readFileSync(path);
  } catch (error) {
    error.message = "font 파일을 읽어오는데 문제가 발생했습니다.";
    error.name = "FontFileUnavailableError";
    throw error;
  }
}

function writeOutputFile(path, data) {
  try {
    return fs.writeFileSync(path, data);
  } catch (error) {
    error.message = "output.pdf 파일을 생성하는데 문제가 발생했습니다.";
    error.name = "OutputFileWriteError";
    throw error;
  }
}

function printAppInfo() {
  console.log("=========================================");
  console.log("============== PDF Labeler ==============");
  console.log("=========================================");
  console.log("Version: 1.0.1");
  console.log("Updates: 긴 텍스트 문자 지원");
  console.log("-----------------------------------------");
  console.log();
}

async function main() {
  try {
    printAppInfo();

    const isProductionEnv = process.env.NODE_ENV !== "development";
    const inputFilePath = isProductionEnv
      ? path.join(process.execPath, "../input.pdf")
      : "./input.pdf";
    const nameListFilePath = isProductionEnv
      ? path.join(process.execPath, "../name_list.txt")
      : "./name_list.txt";
    const fontFilePath = isProductionEnv
      ? `${path.join(__dirname, "font")}/NanumGothicCoding.ttf`
      : "./font/NanumGothicCoding.ttf";

    const existingPdfBytes = readInputFile(inputFilePath);
    const nameListFile = readNameListFile(nameListFilePath);
    const customFont = readFontFile(fontFilePath);

    const nameList = nameListFile.split("\n");
    const nameCount = nameList.length;

    const pdfDoc = await PDFDocument.create();

    let indices = null;

    progressBar.start(nameCount, 0);

    for (let i = 0; i < nameCount; i++) {
      // Load a PDFDocument from the existing PDF bytes
      const tempPdfDoc = await PDFDocument.load(existingPdfBytes);

      tempPdfDoc.registerFontkit(fontkit);

      const font = await tempPdfDoc.embedFont(customFont);

      const name = nameList[i];
      const pageCount = tempPdfDoc.getPageCount();
      const pages = tempPdfDoc.getPages();

      for (let j = 0; j < pageCount; j++) {
        const currentPage = pages[j];
        const { width, height } = currentPage.getSize();

        const textSize = 12;

        const textWidth = font.widthOfTextAtSize(name, textSize);

        currentPage.drawText(`${name}`, {
          x: width - textWidth - 16,
          y: height - textSize * 2,
          size: textSize,
          font,
          color: rgb(0, 0, 0)
        });
      }
      await tempPdfDoc.save();

      if (!indices) {
        indices = new Array(pageCount);
        for (let k = 0; k < pageCount; k++) {
          indices[k] = k;
        }
      }

      // Get the first page of the document
      const copiedPages = await pdfDoc.copyPages(tempPdfDoc, indices);

      for (let k = 0; k < pageCount; k++) {
        pdfDoc.addPage(copiedPages[k]);
      }
      progressBar.increment();
    }
    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();
    progressBar.stop();

    console.log();
    console.log(">> 라벨링된 파일 생성중");

    const outputFilePath = isProductionEnv
      ? path.join(process.execPath, "../output.pdf")
      : "./output.pdf";
    writeOutputFile(outputFilePath, pdfBytes);
    console.log(">> 파일 생성 완료");
    console.log();
    console.log('"x" 버튼으로 종료해주세요');
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
  }
}

main();

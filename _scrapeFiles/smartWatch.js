const axios = require("axios");
const jsdom = require("jsdom");
const fs = require("fs");
const puppeteer = require("puppeteer");
const { JSDOM } = jsdom;

// const Obj = {
//   originalPrice: "",
//   finalPrice: "",
//   savingPrice: "",
//   fullName: "",
//   description: "",
//   technicalDetails: [{ "detail": "", "value": "" }],
//   additionalDetails:[{ "detail": "", "value": "" }],
//   totalReviews:"",
//   reviewArr:[{
//      "name": "",
//      "title": "",
//      "rating": "",
//      "date": "",
//      "description": ""
//      }],
//   imageArr:[],
// };

const smartwatchScraperUrl = async (url) => {
  try {
    console.log(url);
    const response = await axios({
      method: "GET",
      url,
      responseType: "text",
    });
    console.log("html is downloaded");
    const htmlWindow = new JSDOM(response.data).window;
    console.log("window obj is created");
    const producturls = Array.from(
      htmlWindow.document.querySelectorAll(
        "div.sg-col.sg-col-4-of-12.sg-col-8-of-16.sg-col-12-of-20 > div > div:nth-child(1) > h2 > a"
      )
    ).map((el) => {
      el.href = el.href.split("?")[0];
      return `https://www.amazon.in${el.href}`;
    });
    console.log(producturls.length);

    return producturls;
  } catch (e) {
    console.log(e);
  }
};

const swObjScraper = async (arr) => {
  try {
    // Launch the chromeless browser and go to the AJIO url
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null, //Defaults to an 800x600 viewport
      executablePath:
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
      //by default puppeteer runs Chromium buddled with puppeteer
      args: ["--start-maximized"],
    });
    // const laptopObjArr = [];
    for (let i = 0; i < arr.length; i++) {
      console.log("do nothing");
      const returnedObj = await puppeteerScrape(arr[i], browser);
      // laptopObjArr.push(returnedObj);
      console.log(returnedObj);
      if (returnedObj.length === 0) {
        continue;
      }
      fs.writeFileSync(
        `./../smartWatches/sw-${i + 1}.json`,
        JSON.stringify(returnedObj)
      );
      console.log("data collected for sw ", i + 1);
    }
    // return laptopObjArr;
  } catch (err) {
    console.log(err);
  }
};

const puppeteerScrape = async (url, browser) => {
  try {
    const newPage = await browser.newPage();
    await newPage.goto(url, {
      waitUntil: "networkidle2",
    });

    const swObj = {};
    // here, we must make sure to scroll the page upto bottom
    await newPage.evaluate(scrollToBottom);
    console.log("scorlled down");

    swObj.originalPrice = await newPage.evaluate(() => {
      if (!document.querySelector(".priceBlockStrikePriceString")) return;
      console.log(
        document
          .querySelector(".priceBlockStrikePriceString")
          .textContent.replace(/\n/g, "")
          .trim()
      );
      return document
        .querySelector(".priceBlockStrikePriceString")
        .textContent.replace(/\n/g, "")
        .trim();
    });
    // if (!swObj.originalPrice) return "";

    // required
    swObj.finalPrice = await newPage.evaluate(() => {
      if (
        !document.querySelector("#priceblock_ourprice") &&
        !document.querySelector("#priceblock_dealprice")
      )
        return;
      if (document.querySelector("#priceblock_ourprice")) {
        console.log(
          document
            .querySelector("#priceblock_ourprice")
            .textContent.replace(/\n/g, "")
            .trim()
        );
        return document
          .querySelector("#priceblock_ourprice")
          .textContent.replace(/\n/g, "")
          .trim();
      }
      if (document.querySelector("#priceblock_dealprice")) {
        console.log(
          document
            .querySelector("#priceblock_dealprice")
            .textContent.replace(/\n/g, "")
            .trim()
        );
        return document
          .querySelector("#priceblock_dealprice")
          .textContent.replace(/\n/g, "")
          .trim();
      }
    });
    if (!swObj.finalPrice) return "";

    swObj.savingPrice = await newPage.evaluate(() => {
      if (!document.querySelector(".priceBlockSavingsString")) return;
      console.log(
        document
          .querySelector(".priceBlockSavingsString")
          .textContent.replace(/\n/g, "")
          .trim()
      );
      return document
        .querySelector(".priceBlockSavingsString")
        .textContent.replace(/\n/g, "")
        .trim();
    });
    // if (!swObj.savingPrice) return "";

    // required
    swObj.fullName = await newPage.evaluate(() => {
      if (!document.querySelector("#productTitle")) return;
      return document
        .querySelector("#productTitle")
        .textContent.replace(/\n/g, "")
        .trim();
    });
    if (!swObj.fullName) return "";

    // required
    swObj.description = await newPage.evaluate(() => {
      if (!document.querySelector("#feature-bullets")) return;
      return Array.from(
        document.querySelectorAll("#feature-bullets > ul > li >span")
      ).map((el) => {
        return el.innerText.replace(/\n/g, "").trim();
      });
    });
    if (!swObj.description) return "";

    //create a obj for efridgeh technicalDetail
    //{ detail:'', value:""}
    // required
    swObj.technicalDetails = await newPage.$$eval(
      "#productDetails_techSpec_section_1 > tbody > tr",
      (arr) => {
        return arr.map((el) => {
          const obj = {};
          obj.detail = el
            .querySelector(".prodDetSectionEntry")
            .innerHTML.replace(/\n/g, "")
            .trim();
          obj.value = el
            .querySelector(".prodDetAttrValue")
            .innerHTML.replace(/\n/g, "")
            .trim();
          return obj;
        });
      }
    );
    if (!swObj.technicalDetails) return "";

    //required
    swObj.additionalDetails = await newPage.$$eval(
      "#productDetails_detailBullets_sections1 > tbody > tr",
      (arr) => {
        console.log(arr.length);
        const finalArr = [];
        arr.forEach((el) => {
          const obj = {};
          if (!el.querySelector(".prodDetAttrValue")) return;
          obj.detail = el
            .querySelector(".prodDetSectionEntry")
            .textContent.replace(/\n/g, "")
            .trim();
          obj.value = el
            .querySelector(".prodDetAttrValue")
            .textContent.replace(/\n/g, "")
            .trim();
          finalArr.push(obj);
        });
        return finalArr;
      }
    );
    if (!swObj.additionalDetails) return "";

    // we will have a deafult rating
    swObj.totalRating = await newPage.evaluate(() => {
      if (!document.querySelector("#averageCustomerReviews")) return;
      return document
        .querySelector("#averageCustomerReviews")
        .innerText.replace(/\n/g, "")
        .trim();
    });
    // if (!swObj.totalReviews) return "";

    swObj.reviewArr = await newPage.$$eval(".a-section.review", (reviewArr) => {
      console.log(reviewArr);
      return reviewArr.map((el) => {
        const obj = {};
        obj.name = el
          .querySelector(".a-profile-name")
          .innerText.replace(/\n/g, "")
          .trim();
        obj.title = el
          .querySelector(".review-title")
          .innerText.replace(/\n/g, "")
          .trim();
        obj.rating = el
          .querySelector(".review-rating")
          .innerText.replace(/\n/g, "")
          .trim();
        obj.date = el
          .querySelector(".review-title")
          .innerText.replace(/\n/g, "")
          .trim();
        obj.description = el
          .querySelector(".review-text-content")
          .innerText.replace(/\n/g, "")
          .trim();
        return obj;
      });
    });

    // hover through all the image thumbnails and then check for the dynamic images
    const thumbnailsArr = await newPage.$$(".imageThumbnail");
    for (let thumbnail of thumbnailsArr) {
      await thumbnail.hover();
    }

    swObj.imageArr = await newPage.$$eval(
      ".image .a-dynamic-image",
      (imageArr) => {
        return imageArr.map((el) => el.src);
      }
    );
    if (!swObj.imageArr) return "";

    await newPage.close();
    return swObj;
  } catch (e) {
    console.error(e);
  }
};

async function scrollToBottom() {
  await new Promise((resolve) => {
    const distance = 100; // should be less than or equal to window.innerHeight
    const delay = 100;
    const timer = setInterval(() => {
      document.scrollingElement.scrollBy(0, distance);
      if (
        document.scrollingElement.scrollTop + window.innerHeight >=
        document.scrollingElement.scrollHeight
      ) {
        console.log("scrolling is done");
        clearInterval(timer);
        resolve();
      }
    }, delay);
  });
}

const main = async () => {
  // let swUrlArr = [];
  // swUrlArr = swUrlArr.concat(
  //   await smartwatchScraperUrl(
  //     "https://www.amazon.in/s?k=smart+watches&page=2&qid=1621356126&ref=sr_pg_1"
  //   )
  // );
  // swUrlArr = swUrlArr.concat(
  //   await smartwatchScraperUrl(
  //     "https://www.amazon.in/s?k=smart+watches&page=2&qid=1621356126&ref=sr_pg_2"
  //   )
  // );
  // swUrlArr = swUrlArr.concat(
  //   await smartwatchScraperUrl(
  //     "https://www.amazon.in/s?k=smart+watches&page=2&qid=1621356126&ref=sr_pg_3"
  //   )
  // );
  // swUrlArr = swUrlArr.concat(
  //   await smartwatchScraperUrl(
  //     "https://www.amazon.in/s?k=smart+watches&page=2&qid=1621356126&ref=sr_pg_4"
  //   )
  // );
  // swUrlArr = swUrlArr.concat(
  //   await smartwatchScraperUrl(
  //     "https://www.amazon.in/s?k=smart+watches&page=2&qid=1621356126&ref=sr_pg_5"
  //   )
  // );
  // console.log("final lenght", swUrlArr.length);
  // // saving the arr to the json doc
  // fs.writeFileSync("./../urlArr/swUrlArr.json", JSON.stringify(swUrlArr));
  // // // now create the objects
  // // //   let laptopArr = JSON.parse(fs.readFileSync("./laptopUrlArr.json", "utf8"));

  let swArr = JSON.parse(fs.readFileSync("./../urlArr/swUrlArr.json", "utf8"));

  // swArr = swArr.slice(0, 1);
  await swObjScraper(swArr);
};

main();

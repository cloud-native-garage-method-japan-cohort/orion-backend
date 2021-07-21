const express = require('express');

const DiscoveryV1 = require('ibm-watson/discovery/v1');
const {IamAuthenticator} = require('ibm-watson/auth');
const config = require('config');

// Watson Discovery接続情報
const API_KEY = Buffer.from(process.env.API_KEY.trim(), "base64");
const SERVICE_URL = Buffer.from(process.env.SERVICE_URL.trim(), "base64");
const ENVIRONMENT_ID = Buffer.from(process.env.ENVIRONMENT_ID.trim(), "base64");
const COLLECTION_ID = Buffer.from(process.env.COLLECTION_ID.trim(), "base64");

// eslint-disable-next-line new-cap
const router = express.Router();


// 接続情報
const discovery = new DiscoveryV1({
  version: config.get('watson.discovery.version'),
  authenticator: new IamAuthenticator({
    apikey: API_KEY,
  }),
  serviceUrl: SERVICE_URL,
});

const createQuery = (categoryLabel, searchStr) => {
  const texts = searchStr.split(' ').map((item) => `text:"${item}"`).join(',');
  return `enriched_text.categories.label::"${categoryLabel}",(${texts})`;
};

const runQuery = async (categoryLabel, searchStr) => {
  const query = createQuery(categoryLabel, searchStr);

  const queryParams = {
    environmentId: ENVIRONMENT_ID,
    collectionId: COLLECTION_ID,
    highlight: true,
    query,
    _return: 'highlight',
  };

  console.log(`Running query - ${query}`);
  const queryResponse = await discovery.query(queryParams);

  // let result = '';
  const results = queryResponse.result.results;
  console.log(JSON.stringify(results, null, '\t'));
  if (queryResponse.result.results && queryResponse.result.results.length > 0) {
    return queryResponse.result.results[0].highlight.text[0]
        .replace(/<em>/g, '')
        .replace(/<\/em>/g, '');

    // const textArray = queryResponse.result.results[0].highlight.text
    // const filtered = textArray.map((text) => {
    //   return text.replace(/<em>/g, '').replace(/<\/em>/g, '');
    // });
    // return filtered;
  } else {
    return '該当する情報が見つかりませんでした。';
  }
};


router.post('/search', async (req, res) => {
  try {
    if (!req.body.searchText) {
      res.status(400).send('Missing search text.');
      return;
    }

    const responseText = await runQuery('/technology and computing/operating systems', req.body.searchText);
    res.json({
      responseText,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to call watson service');
  }
});

module.exports = router;

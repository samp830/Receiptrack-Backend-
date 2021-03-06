// Copyright 2015-2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const express = require('express');
const config = require('../config');
const images = require('../lib/images');

function getModel () {
  return require(`./model-${config.get('DATA_BACKEND')}`);
}

const router = express.Router();

// Set Content-Type for all responses for these routes
router.use((req, res, next) => {
  res.set('Content-Type', 'text/html');
  next();
});

/**
 * GET /receipts/add
 *
 * Display a page of receipts (up to ten at a time).
 */
router.get('/', (req, res, next) => {
  getModel().list(10, req.query.pageToken, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }
    res.render('receipts/list.jade', {
      receipts: entities,
      nextPageToken: cursor
    });
  });
});

/**
 * GET /receipts/add
 *
 * Display a form for creating a receipt.
 */
router.get('/add', (req, res) => {
  res.render('receipts/add.jade', {
    receipt: {},
    action: 'Add'
  });
});

/**
 * POST /receipts/add
 *
 * Create a receipt.
 */
// [START add]
router.post(
  '/add',
  images.multer.single('image'),
  images.sendUploadToGCS,
  (req, res, next) => {
    let data = req.body;

    // Was an image uploaded? If so, we'll use its public URL
    // in cloud storage.
    if (req.file && req.file.cloudStoragePublicUrl) {
      data.imageUrl = req.file.cloudStoragePublicUrl;
    }

    // Save the data to the database.
    getModel().create(data, (err, savedData) => {
      if (err) {
        next(err);
        return;
      }
      res.redirect(`${req.baseUrl}/${savedData.id}`);
    });
  }
);
// [END add]

/**
 * GET /receipts/:id/edit
 *
 * Display a receipt for editing.
 */
router.get('/:receipt/edit', (req, res, next) => {
  getModel().read(req.params.receipt, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.render('receipts/form.jade', {
      receipt: entity,
      action: 'Edit'
    });
  });
});

/**
 * POST /receipts/:id/edit
 *
 * Update a receipt.
 */
router.post(
  '/:receipt/edit',
  images.multer.single('image'),
  images.sendUploadToGCS,
  (req, res, next) => {
    let data = req.body;

    // Was an image uploaded? If so, we'll use its public URL
    // in cloud storage.
    if (req.file && req.file.cloudStoragePublicUrl) {
      req.body.imageUrl = req.file.cloudStoragePublicUrl;
    }

    getModel().update(req.params.receipt, data, (err, savedData) => {
      if (err) {
        next(err);
        return;
      }
      res.redirect(`${req.baseUrl}/${savedData.id}`);
    });
  }
);

/**
 * GET /receipts/:id
 *
 * Display a receipt.
 */
router.get('/:receipt', (req, res, next) => {
  getModel().read(req.params.receipt, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.render('receipts/view.jade', {
      receipt: entity
    });
  });
});

/**
 * GET /receipts/:id/delete
 *
 * Delete a receipt.
 */
router.get('/:receipt/delete', (req, res, next) => {
  getModel().delete(req.params.receipt, (err) => {
    if (err) {
      next(err);
      return;
    }
    res.redirect(req.baseUrl);
  });
});

/**
 * Errors on "/receipts/*" routes.
 */
router.use((err, req, res, next) => {
  // Format error and forward to generic error handler for logging and
  // responding to the request
  err.response = err.message;
  next(err);
});

module.exports = router;

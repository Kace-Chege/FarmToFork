// Require dependencies.
const driver = require('bigchaindb-driver');
const bip39 = require('bip39');

// Require the dotenv library.
require('dotenv').config()

class FarmToFork {


    /**
     * Initialise a new class that we'll use to handle our connection with the network.
     */
    constructor() {
        // Initialise a new connection.
        this.connection = new driver.Connection(process.env.APP_URL, {
            app_id: process.env.APP_ID,
            app_key: process.env.APP_KEY,
        });

        this.currentIdentity = this.generateKeypair("ftf");
    }

    // Here we'll write our methods.

    /**
     * Generate a keypair based on the supplied seed string.
     * @param {string} keySeed - The seed that should be used to generate the keypair.
     * @returns {*} The generated keypair.
     */
    generateKeypair(keySeed) {
        if (typeof keySeed == "undefined" || keySeed == "") return new driver.Ed25519Keypair();
        return new driver.Ed25519Keypair(bip39.mnemonicToSeed(keySeed).slice(0, 32));
    }

    createAsset(foodItem) {

        return new Promise((resolve, reject) => {

            // Create asset object.
            const assetData = {
                "type": "FtfTutorialAsset",
                "item": foodItem,
            };

            // Create metadata object.
            const metaData = {
                "action": "Introduced",
                "date": new Date().toISOString(),
            };

            // Create a CREATE transaction.
            const introduceFoodItemToMarketTransaction = driver.Transaction.makeCreateTransaction(

                // Include the foodItem as asset data.
                assetData,
                // Include metadata to give information on the action.
                metaData,
                // Create an output.
                [driver.Transaction.makeOutput(
                    driver.Transaction.makeEd25519Condition(this.currentIdentity.publicKey))],
                // Include the public key
                this.currentIdentity.publicKey
            );

            // We sign the transaction
            const signedTransaction = driver.Transaction.signTransaction(introduceFoodItemToMarketTransaction, this.currentIdentity.privateKey);

            // Post the transaction to the network
            this.connection.postTransaction(signedTransaction).then(response => {

                // Check the status and return when succesfull
                return this.connection.pollStatusAndFetchTransaction(response.id);
            }).then(postedTransaction => {

                // Let the promise resolve the created transaction.
                resolve(postedTransaction);

                // Catch exceptions
            }).catch(err => {

                reject(err);
            })
        });

    }

    /**
     * Get a list of ids of unspent transactions for a certain public key.
     * @returns {Array} An array containing all unspent transactions for a certain public key.
     */
    getAssets() {

        return new Promise((resolve, reject) => {

            // Get a list of ids of unspent transactions from a public key.
            this.connection.listOutputs(this.currentIdentity.publicKey, false).then(response => {

                resolve(response);
            });
        }).catch(err => {
            reject(err);
        })

    }

    /**
     * Load a transaction by using its transaction id.
     * @param {*} transactionId 
     */
    loadTransaction(transactionId) {
        return new Promise((resolve, reject) => {

            // Get the transaction by its ID.
            this.connection.getTransaction(transactionId).then(response => {
                resolve(response);
            }).catch(err => {
                reject(err);
            })
        });
    }

    updateAsset(transaction, action) {

        return new Promise((resolve, reject) => {

            console.log(transaction);

            // Create metadata for action.
            const metaData = {
                "action": action,
                "date": new Date().toISOString()
            };

            // Create a new TRANSFER transaction.
            const updateAssetTransaction = driver.Transaction.makeTransferTransaction(

                // previous transaction.
                [{ tx: transaction, output_index: 0 }],

                // Create new output.
                [driver.Transaction.makeOutput(driver.Transaction.makeEd25519Condition(this.currentIdentity.publicKey))],

                // Add metadata.
                metaData
            )

            // Sign new transaction.
            const signedTransaction = driver.Transaction.signTransaction(updateAssetTransaction, this.currentIdentity.privateKey);

            console.log("Posting transaction.");
            // Post the new transaction.
            this.connection.postTransaction(signedTransaction).then(response => {

                console.log("Transaction posted.");

                // Poll for status.
                return this.connection.pollStatusAndFetchTransaction(response.id);
            }).then(postedTransaction => {

                // Return the posted transaction to the callback function.
                resolve(postedTransaction);

            }).catch(err => {
                reject(err);
            });
        });

    }
}

// Create exports to make some functionality available in the browser.

module.exports = {
    FarmToFork
}
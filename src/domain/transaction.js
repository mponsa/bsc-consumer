const abiDecoder = require("abi-decoder");
const BEP20_ABI = require("../config/BEP20_ABI.json");
const Router_ABI = require("../config/Router_ABI.json");
const Web3 = require('web3')
const _ = require('lodash')

const config = require('../config/config')

const web3 = new Web3(config.get('chainUrl'));

abiDecoder.addABI(BEP20_ABI);
abiDecoder.addABI(Router_ABI);

class Transaction{
    constructor (transaction, receipt){
        this.transaction = transaction
        this.receipt = receipt
        this.callFunction = abiDecoder.decodeMethod(transaction.input)
        this.logs = abiDecoder.decodeLogs(receipt.logs)
        this.addresses = this._getAddressesInvolved() 
    }

    async _getBlock(blockNumber, retry = 0){
        if(retry > 10){
            return null
        }

        let block = await web3.eth.getBlock(blockNumber)

        if(!block){
            block = await this._getBlock(blockNumber, retry + 1)
        } 

        return block
    }


    _getAddressesInvolved(){
        const path = this.callFunction ? this.callFunction.params.filter(param => param.name == 'path') : undefined
            
        if(path && path.length > 0){
                return path[0].value
        }

        return undefined
    }

    async getTimestamp(){
        const block = await this._getBlock(this.transaction.blockNumber)
        
        if(!block){
            return null    
        }

        return new Date(block.timestamp * 1000)
    }

    getAddressTo(){
        if(this.addresses && this.addresses.length > 0){
            return this.addresses[this.addresses.length - 1]
        }

        return undefined
    }

    getAddressFrom(){
        if(this.addresses && this.addresses.length > 0){
            return this.addresses[0]
        }

        return undefined
    }

    getAddressIndexInPath(addr){
        for(let i = 0; i < this.addresses.length; i++){
            if(addr.toUpperCase() === this.addresses[i].toUpperCase()){
                return i
            }
        }

        return -1
    }

    getAddressInIndex(index){
        return this.addresses[index]
    }

    getAddressOcurrencesInPath(addr){
        let count = 0
        
        this.addresses.forEach(address => {
            if (address.toUpperCase() == addr.toUpperCase()) count += 1
        })

        return count
    }

    getTransferedAmount(addr){
        try{
            const transfers = this.logs.filter((x) => x.name === "Transfer")

            if(transfers.length > 0 && addr){
                const transferData = transfers.filter(event => event.address.toUpperCase() === addr.toUpperCase())[0]
                return web3.utils.fromWei(_.find(transferData.events, (x) => x.name === "value").value,"ether")
            }
    
            return undefined
        }catch(error){
            console.log(error.message)
            return undefined
        }
    }
} 


module.exports = Transaction
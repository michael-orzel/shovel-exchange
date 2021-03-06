import Web3 from 'web3'
//import detectEthereumProvider from '@metamask/detect-provider'
import { ETHER_ADDRESS } from '../helpers'
import {
  web3Loaded,
  web3AccountLoaded,
  tokenLoaded,
  exchangeLoaded,
  cancelledOrdersLoaded,
  filledOrdersLoaded,
  allOrdersLoaded,
  orderCancelling,
  orderCancelled,
  orderFilling,
  orderFilled,
  etherBalanceLoaded,
  tokenBalanceLoaded,
  exchangeEtherBalanceLoaded,
  exchangeTokenBalanceLoaded,
  balancesLoaded,
  balancesLoading,
  orderMade,
  buyOrderMaking,
  sellOrderMaking
} from './actions'
import Token from '../abis/Token.json'
import Exchange from '../abis/Exchange.json'

require('web3')

const ethEnabled = async () => {
  if(window.ethereum) {
    await window.ethereum.request({ method: 'eth_requestAccounts' })
    window.web3 = new Web3(window.ethereum)
    return true
  }

  return false
}

export const loadWeb3 = (dispatch) => {
  if(ethEnabled()) {
    const web3 = new Web3(window.ethereum)
    dispatch(web3Loaded(web3))
    return web3
  } else {
    window.alert('Please install MetaMask')
    window.location.assign("https://metamask.io/")
  }
}

export const loadAccount = async (web3, dispatch) => {
  try {
    const accounts = await web3.eth.getAccounts()
    const account = accounts[0]
    dispatch(web3AccountLoaded(account))
    return account
  } catch (error) {
    // User denied account access
    console.error(error)
    window.alert('Account not loaded. Please accept account access')
  }
}

export const loadToken = async (web3, networkId, dispatch) => {
  try {
    const token = new web3.eth.Contract(Token.abi, Token.networks[networkId].address)
    dispatch(tokenLoaded(token))
    return token
  } catch(error) {
    console.log('Contract not deployed to the current network. Please select another network with Metamask.')
    return null
  }
}

export const loadExchange = async (web3, networkId, dispatch) => {
  try {
    const exchange = new web3.eth.Contract(Exchange.abi, Exchange.networks[networkId].address)
    dispatch(exchangeLoaded(exchange))
    return exchange
  } catch(error) {
    console.log('Contract not deployed to the current network. Please select another network with Metamask.')
    return null
  }
}

export const loadAllOrders = async (exchange, dispatch) => {
  // Fetch cancelled orders with the "Cancel" event stream
  const cancelStream = await exchange.getPastEvents('Cancel', { fromBlock: 0, toBlock: 'latest' })
  // Format cancelled orders
  const cancelledOrders = cancelStream.map((event) => event.returnValues)
  // Add cancelled orders to the redux store
  dispatch(cancelledOrdersLoaded(cancelledOrders))

  // Fetch filled orders with the "Trade" event stream
  const tradeStream = await exchange.getPastEvents('Trade', { fromBlock: 0, toBlock: 'latest' })
  const filledOrders = tradeStream.map((event) => event.returnValues)
  dispatch(filledOrdersLoaded(filledOrders))

  // Fetch all orders with the "Order" event stream
  const orderStream = await exchange.getPastEvents('Order', { fromBlock: 0, toBlock: 'latest' })
  const allOrders = orderStream.map((event) => event.returnValues)
  dispatch(allOrdersLoaded(allOrders))
}

export const subscribeToEvents = async (exchange, dispatch) => {
  exchange.events.Cancel({}, (error, event) => {
    dispatch(orderCancelled(event.returnValues))
  })

  exchange.events.Trade({}, (error, event) => {
    dispatch(orderFilled(event.returnValues))
  })

  exchange.events.Deposit({}, (error, event) => {
    dispatch(balancesLoaded())
  })

  exchange.events.Withdraw({}, (error, event) => {
    dispatch(balancesLoaded())
  })

  exchange.events.Order({}, (error, event) => {
    dispatch(orderMade(event.returnValues))
  })
}

export const cancelOrder = (order, account, exchange, dispatch) => {
  exchange.methods.cancelOrder(order.id).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(orderCancelling())
  })
  .on('error', (error) => {
    console.log(error)
    window.alert('There was an error!')
  })
}

export const fillOrder = (order, account, exchange, dispatch) => {
  exchange.methods.fillOrder(order.id).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(orderFilling())
  })
  .on('error', (error) => {
    console.log(error)
    window.alert('There was an error!')
  })
}

export const loadBalances = async (web3, account, token, exchange, dispatch) => {
  if(typeof account !== 'undefined') {
    // Ether balance in wallet
    const etherBalance = await web3.eth.getBalance(account)
    dispatch(etherBalanceLoaded(etherBalance))

    // Token balance in wallet
    const tokenBalance = await token.methods.balanceOf(account).call()
    dispatch(tokenBalanceLoaded(tokenBalance))

    // Ether balance in exchange
    const exchangeEtherBalance = await exchange.methods.balanceOf(ETHER_ADDRESS, account).call()
    dispatch(exchangeEtherBalanceLoaded(exchangeEtherBalance))

    // Token balance in exchange
    const exchangeTokenBalance = await exchange.methods.balanceOf(token.options.address, account).call()
    dispatch(exchangeTokenBalanceLoaded(exchangeTokenBalance))

    // Trigger all balances loaded
    dispatch(balancesLoaded())
  } else {
    window.alert('Please login with MetaMask')
  }
}

export const depositEther = (web3, account, exchange, amount, dispatch) => {
  exchange.methods.depositEther().send({ from: account, value: web3.utils.toWei(amount, 'ether') })
  .on('transactionHash', (hash) => {
    dispatch(balancesLoading())
  })
  .on('error', (error) => {
    console.error(error)
    window.alert(`There was an error!`)
  })
}

export const withdrawEther = (web3, account, exchange, amount, dispatch) => {
  exchange.methods.withdrawEther(web3.utils.toWei(amount, 'ether')).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(balancesLoading())
  })
  .on('error', (error) => {
    console.error(error)
    window.alert(`There was an error!`)
  })
}

export const depositToken = async (web3, account, token, exchange, amount, dispatch) => {
  amount = web3.utils.toWei(amount, 'ether')
  const approved = await token.methods.approve(exchange.options.address, amount).send({ from: account })

  if(approved) {
    exchange.methods.depositToken(token.options.address, amount).send({ from: account })
    .on('transactionHash', (hash) => {
      dispatch(balancesLoading())
    })
    .on('error', (error) => {
      console.error(error)
      window.alert(`There was an error!`)
    })
  }
}

export const withdrawToken = (web3, account, token, exchange, amount, dispatch) => {
  exchange.methods.withdrawToken(token.options.address, web3.utils.toWei(amount, 'ether')).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(balancesLoading())
  })
  .on('error', (error) => {
    console.error(error)
    window.alert(`There was an error!`)
  })
}

export const makeBuyOrder = (web3, account, token, exchange, order, dispatch) => {
  const tokenGet = token.options.address
  const amountGet = web3.utils.toWei(order.amount, 'ether')
  const tokenGive = ETHER_ADDRESS
  const amountGive = web3.utils.toWei((order.amount * order.price).toString(), 'ether')

  exchange.methods.makeOrder(tokenGet, amountGet, tokenGive, amountGive).send({ from: account })
  .on('transactionhash', (hash) => {
    dispatch(buyOrderMaking())
  })
  .on('error', (error) => {
    console.error(error)
    window.alert(`There was an error!`)
  })
}

export const makeSellOrder = (web3, account, token, exchange, order, dispatch) => {
  const tokenGet = ETHER_ADDRESS
  const amountGet = web3.utils.toWei((order.amount * order.price).toString(), 'ether')
  const tokenGive = token.options.address
  const amountGive = web3.utils.toWei(order.amount, 'ether')

  exchange.methods.makeOrder(tokenGet, amountGet, tokenGive, amountGive).send({ from: account })
  .on('transactionhash', (hash) => {
    dispatch(sellOrderMaking())
  })
  .on('error', (error) => {
    console.error(error)
    window.alert(`There was an error!`)
  })
}

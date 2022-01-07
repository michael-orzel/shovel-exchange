import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Tabs, Tab } from 'react-bootstrap'
import Spinner from './Spinner'
import { cancelOrder } from '../store/interactions'
import {
  myFilledOrdersLoadedSelector,
  myFilledOrdersSelector,
  myOpenOrdersLoadedSelector,
  myOpenOrdersSelector,
  accountSelector,
  exchangeSelector,
  orderCancellingSelector
} from '../store/selectors'

const showMyFilledOrders = (myFilledOrders) => {
  return (
    <tbody>
      { myFilledOrders.map((order) => {
        return (
          <tr key={order.id}>
            <td className="text-muted">{order.formattedTimestamp}</td>
            <td className={`text-${order.orderTypeClass}`}>{order.orderSign}{order.tokenAmount}</td>
            <td className={`text-${order.orderTypeClass}`}>{order.tokenPrice}</td>
          </tr>
        )
      }) }
    </tbody>
  )
}

const showMyOpenOrders = (props) => {
  const { myOpenOrders, account, exchange, dispatch } = props
  
  return (
    <tbody>
      { myOpenOrders.map((order) => {
        return (
          <tr key={order.id}>
            <td className={`text-${order.orderTypeClass}`}>{order.tokenAmount}</td>
            <td className={`text-${order.orderTypeClass}`}>{order.tokenPrice}</td>
            <td 
              className="text-muted cancel-order"
              onClick={(e) => {
                cancelOrder(order, account, exchange, dispatch)
              }}
            >X</td>
          </tr>
        )
      }) }
    </tbody>
  )
}

class MyTransactions extends Component {
  render() {
    return (
      <div className="card bg-dark text-white">
        <div className="card-header">
          My Transactions
        </div>
        <div className="card-body">
          <Tabs defaultActiveKey="trades" className="bg-dark text-white">

            <Tab eventKey="trades" title="Trades" className="bg-dark">
              <table className="table table-dark table-sm small">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>SHVL</th>
                    <th>SHVL/ETH</th>
                  </tr>
                </thead>
                { this.props.myFilledOrdersLoaded ? showMyFilledOrders(this.props.myFilledOrders) : <Spinner type="table" /> }
              </table>
            </Tab>
            
            <Tab eventKey="orders" title="Orders" className="bg-dark">
            <table className="table table-dark table-sm small">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>SHVL/ETH</th>
                    <th>Cancel</th>
                  </tr>
                </thead>
                { this.props.showMyOpenOrders ? showMyOpenOrders(this.props) : <Spinner type="table" /> }
              </table>
            </Tab>

          </Tabs>
        </div>
      </div>
    )
  }
}

function mapStateToProps(state) {
  const myOpenOrdersLoaded = myOpenOrdersLoadedSelector(state)
  const orderCancelling = orderCancellingSelector(state)

  return {
    myFilledOrdersLoaded: myFilledOrdersLoadedSelector(state),
    myFilledOrders: myFilledOrdersSelector(state),
    showMyOpenOrders: myOpenOrdersLoaded && !orderCancelling,
    myOpenOrders: myOpenOrdersSelector(state),
    account: accountSelector(state),
    exchange: exchangeSelector(state)
  }
}

export default connect(mapStateToProps)(MyTransactions)

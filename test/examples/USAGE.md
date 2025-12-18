# Example: Stock Analysis with SAMCO Agent

This example demonstrates how to use the SAMCO agent to analyze stocks and generate trading code.

## Quick Start

1. Open VS Code with the SAMCO extension installed
2. Open the chat panel (Ctrl+Shift+I or Cmd+Shift+I)
3. Type `@samco` followed by your query

## Example Queries

### Basic Stock Analysis

```
@samco /samco analyze AAPL
```

This will generate Python code to fetch and analyze Apple stock data.

### Create a Trading Strategy

```
@samco create a simple moving average crossover strategy for backtesting
```

### Portfolio Optimization

```
@samco /portfolio optimize a portfolio with AAPL, GOOGL, MSFT for max Sharpe ratio
```

## Sample Generated Code

When you ask SAMCO to analyze a stock, it might generate code like this:

```python
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt

def analyze_stock(symbol: str, period: str = '1y'):
    """
    Analyze stock with technical indicators
    
    Args:
        symbol: Stock ticker symbol
        period: Time period for analysis (1y, 6mo, etc.)
    """
    try:
        # Fetch stock data
        stock = yf.Ticker(symbol)
        df = stock.history(period=period)
        
        # Calculate technical indicators
        df['SMA_20'] = df['Close'].rolling(window=20).mean()
        df['SMA_50'] = df['Close'].rolling(window=50).mean()
        df['RSI'] = calculate_rsi(df['Close'])
        
        # Display summary
        print(f"\\n{symbol} Analysis Summary")
        print(f"Current Price: ${df['Close'].iloc[-1]:.2f}")
        print(f"20-day SMA: ${df['SMA_20'].iloc[-1]:.2f}")
        print(f"50-day SMA: ${df['SMA_50'].iloc[-1]:.2f}")
        print(f"RSI: {df['RSI'].iloc[-1]:.2f}")
        
        return df
        
    except Exception as e:
        print(f"Error analyzing {symbol}: {e}")
        return None

def calculate_rsi(prices, period=14):
    """Calculate Relative Strength Index"""
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

if __name__ == "__main__":
    # Analyze Apple stock
    df = analyze_stock('AAPL')
    
    if df is not None:
        # Plot
        plt.figure(figsize=(12, 6))
        plt.plot(df.index, df['Close'], label='Close Price')
        plt.plot(df.index, df['SMA_20'], label='20-day SMA')
        plt.plot(df.index, df['SMA_50'], label='50-day SMA')
        plt.title('AAPL Stock Analysis')
        plt.xlabel('Date')
        plt.ylabel('Price ($)')
        plt.legend()
        plt.grid(True)
        plt.show()
```

## Usage Notes

- Always install required packages: `pip install yfinance pandas numpy matplotlib`
- API keys may be required for some data sources
- Remember the disclaimer: this is for educational purposes only

## Advanced Examples

Check the `examples/` directory for more complex scenarios:

- `momentum_strategy.py` - Momentum-based trading strategy
- `portfolio_optimizer.py` - Mean-variance portfolio optimization
- `risk_analysis.py` - Value at Risk (VaR) calculation
- `backtest_framework.py` - Complete backtesting system

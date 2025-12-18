# SAMCO Agent

**Stock Analysis and Market Context Observer** - An AI-powered VS Code coding assistant for stock market analysis and trading insights.

## Features

- 🤖 **AI-Powered Chat Agent**: Integrated VS Code chat participant with skill-based inference
- 📊 **Stock Analysis**: Generate complete analysis code for stocks and portfolios
- 💹 **Trading Strategies**: Create backtesting frameworks and trading systems
- 🎯 **Skill-Based Architecture**: Extensible slash command system
- 📈 **Market Insights**: Real-time analysis and recommendations
- 🔧 **Code Generation**: Production-ready Python/TypeScript code with best practices

## Installation

1. Install the extension from VS Code marketplace (or load locally)
2. Configure your OpenAI API key:
   - Open Settings (`Cmd+,` on Mac, `Ctrl+,` on Windows/Linux)
   - Search for "SAMCO"
   - Enter your OpenAI API key

## Usage

### Chat Interface

Open the chat panel and use `@samco`:

```
@samco analyze AAPL stock
@samco create a momentum trading strategy
@samco /samco optimize my portfolio
```

### Slash Commands

The SAMCO agent supports skill-based slash commands:

- `/samco` - Stock analysis and market insights
- `/analyze` - Detailed stock analysis
- `/strategy` - Trading strategy development
- `/portfolio` - Portfolio analysis and optimization

### Example Queries

**Stock Analysis:**
```
@samco /samco analyze TSLA
```

**Generate Trading Code:**
```
@samco create Python code to backtest a moving average crossover strategy
```

**Portfolio Optimization:**
```
@samco /portfolio optimize for maximum Sharpe ratio
```

## Skills

Skills are defined in the `skills/` directory. Each skill has a `SKILL.md` file that contains:

- Command triggers
- Behavior instructions
- Code generation rules
- Output formatting

### Available Skills

#### SAMCO Skill (`/samco`)
Stock Analysis and Market Context Observer - comprehensive stock market analysis, trading insights, and financial code generation.

See [skills/samco/SKILL.md](skills/samco/SKILL.md) for full documentation.

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `samco.openaiApiKey` | Your OpenAI API key | `""` |
| `samco.model` | OpenAI model to use | `gpt-4-turbo-preview` |
| `samco.defaultDataSource` | Default stock data source | `yfinance` |
| `samco.enableBackgroundAnalysis` | Enable background jobs | `true` |
| `samco.maxConcurrentJobs` | Max concurrent background tasks | `3` |

## Views

### Market Analysis View
Displays real-time analysis results, key metrics, and market data.

### Portfolio Insights View
Shows portfolio composition, performance metrics, and optimization suggestions.

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode
npm run watch

# Package extension
vsce package
```

### Project Structure

```
samco-agent/
├── skills/
│   └── samco/
│       └── SKILL.md          # SAMCO skill definition
├── src/
│   ├── agent/
│   │   └── SamcoAgent.ts     # Core agent logic
│   ├── chat/
│   │   └── ChatParticipant.ts # Chat integration
│   ├── skills/
│   │   └── SkillManager.ts   # Skill loading/management
│   ├── jobs/
│   │   └── BackgroundJobManager.ts # Background tasks
│   ├── views/
│   │   ├── AnalysisViewProvider.ts
│   │   └── PortfolioViewProvider.ts
│   └── extension.ts          # Extension entry point
├── package.json
├── tsconfig.json
└── README.md
```

### Adding New Skills

1. Create a new directory in `skills/`:
   ```
   skills/my-skill/
   └── SKILL.md
   ```

2. Define the skill in `SKILL.md`:
   ```markdown
   # MY SKILL
   
   ## Command
   `/my-skill`
   
   ## Description
   What this skill does...
   
   ## Behavior
   How it works...
   ```

3. The skill will be automatically loaded by the SkillManager

## Security

⚠️ **Important Security Notes:**

- Your OpenAI API key is stored securely by VS Code
- Never commit API keys to version control
- The extension does not log or expose your API key
- Generated code may contain placeholders for API keys - always protect these

## Disclaimer

⚠️ **Financial Disclaimer:**

This tool is for **educational and informational purposes only**. It does not constitute financial advice, investment recommendations, or trading signals. Always conduct your own research and consult with qualified financial professionals before making investment decisions.

- Past performance does not guarantee future results
- Trading and investing involve substantial risk
- Generated code and analysis should be thoroughly tested
- Never risk money you cannot afford to lose

## License

MIT License - see LICENSE file for details

## Support

- Report issues: [GitHub Issues](https://github.com/yourusername/samco-agent/issues)
- Documentation: [GitHub Wiki](https://github.com/yourusername/samco-agent/wiki)

## Acknowledgments

Built with:
- VS Code Extension API
- OpenAI API
- TypeScript

---

**Made with ❤️ for traders and developers**

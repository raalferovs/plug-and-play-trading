//+------------------------------------------------------------------+
//|                                                     WakaWaka.mq5 |
//|                                  Copyright 2025, MetaQuotes Ltd. |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2025, MetaQuotes Ltd."
#property link      "https://www.mql5.com"
#property version   "1.00"
#property strict
#property description "TriEdge EA"

#include <Trade\Trade.mqh>
#include <Licensing.mqh>
CTrade         Trade;
CPositionInfo  posInfo;
COrderInfo     ordInfo;

enum LotSizingEnum{
   LowRiskPreset = 5,         //Low Risk Set 20% annual (0.25% load)
   MidRiskPreset = 4,         //Mid Risk Set 40% annual (0.5% load)
   HighRiskPreset = 3,        //Significant Risk Set 80% annual (1.0% load)
   ExtremeRiskPreset = 7,     //High Risk Set 120% annual (1.5% load)
   LotsEquity = 2,            //Dynamic Lot based on Equity
   LotsBalance = 1,           //Dynamic Lot based on Balance
   LotsDepositLoad = 6,       //Lots based on Deposit load
   FixedLots = 0              //Fixed Lot
  };

enum AllowBuySellEnum{
   AllowSell2 = 2,         //Sell only
   AllowBuy1 = 1,          // Buy only
   AllowBuySell = 0,       // Buy and Sell
  };

enum eMaxDrawdownAction{
   IgnoreNewUntilRestart = 3,          //Prohibit opening new grids until restart
   IgnoreNewSignals = 2,               //Prohibit opening new grids
   CloseStopTradingUntilRestart = 1,   //Close trades & stop trading until restart
   CloseStopTradingFor24h = 0          //Close trades & stop trading for 24h
  };

enum eDrawdownCalculation{
   ThisStrategy = 1,    //This strategy
   TheAccount = 0       //The account
  };

struct SymbolInformation{
   string            SymbolName;
   datetime          LastMainTFUpdate;
   datetime          LastOPOTFUpdate;
   int               UpdateCounter;
   bool              CanBuy;
   bool              CanSell;
   datetime          CurrentBarTime;
   datetime          PreviousBarTime;
   double            ClosePrice;
   bool              GridOpened;
   bool              OPOTriggered;
   double            SmartDistanceMultiplier;
   double            BBWidth;
   int               LastBarIndex;
   int               CurrentBarIndex;
   long              PatternValue;
   double            PatternPrice;
   bool              PatternSearchActive;
   bool              TradingAllowedToday;
   bool              PreviousDayTradingAllowed;
   int               LastDayOfWeek;
   double            MaxGridLotMultiplier;
   double            LastBuyAvgPrice;
   double            LastSellAvgPrice;
   double            LastBuyTP;
   double            LastSellTP;
   datetime          LastBuyGridTime;
   datetime          LastSellGridTime;
  };
  
class MagicHelper {
  private:
    int     m_base;        // MagicNumberBase (84570)
    int     m_uid;         // UID (0-9)
    int     m_magicBase;   // base + uid
    int     m_digits;      // how many digits in m_magicBase
    
   public:
       // Constructor - stores all the values we need
       MagicHelper(int base, int uid) {
           m_base = base;
           m_uid = uid;
           m_magicBase = base + uid;
           m_digits = StringLen(IntegerToString(m_magicBase));
       }

   // Get the base part (84570 + UID)
   int GetBase() { return m_magicBase; }
   
   // Get magic number for a direction (1=buy, 2=sell) WITHOUT level
   // This is for the "base" orders (level 0)
   int GetDirectionMagic(int direction) {
       return (int)MathPow(10, m_digits + 2) * direction + m_magicBase * 100;
   }
  
   // Get magic number for a specific level and direction
   // This is for grid orders (level 1,2,3...)
   int GetLevelMagic(int direction, int level) {
       return (int)MathPow(10, m_digits + 2) * direction + m_magicBase * 100 + level;
   }  
  
   // Check if a magic number belongs to our EA
   bool IsOurOrder(int magic) {
       if(magic <= 0) return false;
       int prefix = magic / 100;   // Get everything except the last 2 digits (level)
       
       // Our prefixes are: m_magicBase + 10^m_digits (for buys)
       // or m_magicBase + 2*10^m_digits (for sells)
       int buyPrefix = m_magicBase + (int)MathPow(10, m_digits);
       int sellPrefix = m_magicBase + (int)MathPow(10, m_digits) * 2;
       
       return (prefix == buyPrefix || prefix == sellPrefix);
   }  
   
   // Get direction from magic number (1=buy, 2=sell, 0=not ours)
   int GetDirectionFromMagic(int magic) {
       if(!IsOurOrder(magic)) return 0;
       int prefix = magic / 100;
       int buyPrefix = m_magicBase + (int)MathPow(10, m_digits);
       int sellPrefix = m_magicBase + (int)MathPow(10, m_digits) * 2;
       
       if(prefix == buyPrefix) return 1;   // Buy
       if(prefix == sellPrefix) return 2;  // Sell
       return 0;
   }  
   
   // Get level from magic number (-1 if base/level 0 order)
   int GetLevelFromMagic(int magic) {
       if(!IsOurOrder(magic)) return -2;
       return magic % 100;   // Last 2 digits are the level
   }
};


input group "<<=========== License ===========>>"
input string LicenseKey      = "";   // Your license key (from your account on Plug & Play Trading)
input string LicenseEndpoint = "";   // Leave empty (override only for development)

input group "<<=========== Tester settings ===========>>"

input bool TestAllCurrencies = false; // Test All Currencies in Tester?

input group "<<=========== Select the risk settings ===========>>"

input bool   AllowOpeningNewGrid        = true;   // Allow Opening a new Grid?
input LotSizingEnum LotSizingMethod     = 5;      // Lot-sizing Method
input double LotSizingValueFixed        = 0.01;   // Fixed Lot
input double LotSizingValueDynamic      = 10000;  // Dynamic Lot (Balance/Equity based)
input double LotSizingDepositLoadPercent= 0.25;   // Deposit Load %
input bool   FixedInitialDeposit        = false;  // Fixed Initial Deposit? (Tester only)
input double MaximumLot                 = 100;    // Maximum Lot
input bool   AutoSplit                  = false;  // Auto Split?
input double MaximumSpread              = 10;     // Maximum Spread, in pips
input int    MaximumSlippage            = 10;     // Maximum Slippage for non-ECN acc, in pips
input int    MaximumSymbols             = 2;      // Maximum Symbols at a time
input bool   AllowHedging               = true;   // Allow Hedging?
input bool   AllowTradingOnHolidays     = false;  // Allow Trading on Holidays?
input AllowBuySellEnum AllowToBuySell   = 0;      // Allow to Buy/Sell
input double MinimumFreeMargin          = 0;      // Minimum Free Margin % [0=disabled]
input double MaximumDrawdown            = 100;    // Max Floating Drawdown %
input double MaximumDrawdownMoney       = 0;      // Max Floating Drawdown in Money [0=disabled]
input eMaxDrawdownAction MaximumDrawdownAction = 0; // Max Drawdown Action
input eDrawdownCalculation DrawdownCalculation = 1;      // Max Drawdown Calculation

input group "<<<<===== Select the strategy settings and symbols used =====>>>>"

input string Symbols              = "AUDNZD,AUDCAD,NZDCAD"; // Symbols separated by comma
input int    HourToStartTrading   = 0;   // Hour to Start Trading (broker's time)
input int    HourToStopTrading    = 23;  // Hour to Stop Trading (broker's time)
input int    BollingerBandsPeriod = 35;  // Bollinger Bands Period
input int    RSI_Period           = 20;  // RSI Period
input int    RSI_Value            = 15;  // Maximum RSI Value

input group "<<<<===== Select TP settings =====>>>>"

input double InitialTP                    = 10;     // TakeProfit for initial trade (pips)
input bool   WeightedTP                   = true;   // Weighted TakeProfit?
input double GridTP                       = 0;      // TakeProfit for grid (0 = dynamic)
input int    BreakEvenAfterThisLevel      = 0;      // Break-even after level (0 = disabled)
input bool   HideTP                       = false;  // Hide TakeProfit?
input bool   Use_OPO_Method               = false;  // Use OPO method to handle TP
input ENUM_TIMEFRAMES OPO_TimeFrame       = 15;     // Timeframe for OPO method
input bool   SmartTP                      = false;  // Smart TakeProfit?
input bool   DoNotAdjustTPUnlessNewGrid   = false;  // Lock TP unless new grid level

input group "<<<<===== Select SL settings =====>>>>"

input double GridSL = 0;
input bool HideSL = false;

input group "<<===== Adjust the grid distance and multipliers =====>>"

input int    TradeDistance        = 35;     // Trade Distance
input bool   SmartDistance        = true;   // Smart Distance?
input double TradeMultiplier_2nd = 1;      // 2nd Trade Multiplier
input double TradeMultiplier_3rd = 2;      // 3rd-5th Trade Multiplier
input double TradeMultiplier_6th = 1.5;    // 6th- Trade Multiplier
input int    MaximumTrades        = 9;      // Maximum Trades
input int    GridLevelToStart     = 1;      // Grid Level to Start (1-initial trade)
input bool   KeepOriginalProfitLotSize = false; // Keep Original Profit Level & Lot Size

input group "<<===== Change the comment and UID if needed =====>>"

input string TradeComment = "TriEdge EA"; // Trade Comment
input int    UID          = 0;                           // UID (0...9)
input bool   ShowPanel    = true;                        // ShowPanel

// Global Variables

int                  TickCounter              = 0;
ENUM_TIMEFRAMES      MainTimeframe            = PERIOD_M15;
SymbolInformation    SymbolsArray[];
int                  MagicNumberBase          = 84570;
double               Epsilon                  = 0.0000001;
int                  LastUpdateMinute         = -1;
long                 LastTimerCheck           = 0;
int                  CurrentHour              = 0;
bool                 DrawdownTriggered        = false;
int                  DrawdownCooldownHours    = 0;
bool                 StopTradingUntilRestart  = false;
int                  LastProcessedHour        = -1;
bool                 SymbolsListError         = false;
double               InitialBalance           = 0.0;
bool                 Initialized              = true;

int handle_MA[];
int handle_Std[];
int handle_RSI[];
int handle_ATR96[];
int handle_ATR672[];

MagicHelper g_magic(MagicNumberBase, UID); 

int OnInit() {

   if(!LicenseInit(LicenseKey, LicenseEndpoint))
      return INIT_FAILED;

   Print(TradeComment + " -> Initializing...");

   ChartSetInteger(0,CHART_SHOW_GRID,false);

   TesterHideIndicators(true);

   Comment("TriEdge EA");

   DrawdownCooldownHours = 0;
   StopTradingUntilRestart = false;
   DrawdownTriggered = false;

   if(!MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_OPTIMIZATION))
      EventSetTimer(5);

   LastTimerCheck = TimeCurrent();

   if(!ParseAndInitializeSymbols())
     {
      Print(TradeComment + " Error: Failed to initialize symbols");
      return INIT_FAILED;
     }

   ArrayResize(handle_MA,    ArraySize(SymbolsArray));
   ArrayResize(handle_Std,   ArraySize(SymbolsArray));
   ArrayResize(handle_RSI,   ArraySize(SymbolsArray));
   ArrayResize(handle_ATR96, ArraySize(SymbolsArray));
   ArrayResize(handle_ATR672,ArraySize(SymbolsArray));

   for(int i = 0; i < ArraySize(SymbolsArray); i++) {
      handle_MA[i]    = iMA(SymbolsArray[i].SymbolName, MainTimeframe, BollingerBandsPeriod+1, 0, MODE_SMA, PRICE_CLOSE);
      handle_Std[i]   = iStdDev(SymbolsArray[i].SymbolName, MainTimeframe, BollingerBandsPeriod+1, 0, MODE_SMA, PRICE_CLOSE);
      handle_RSI[i]   = iRSI(SymbolsArray[i].SymbolName, MainTimeframe, RSI_Period, PRICE_CLOSE);
      handle_ATR96[i] = iATR(SymbolsArray[i].SymbolName, MainTimeframe, 96);
      handle_ATR672[i]= iATR(SymbolsArray[i].SymbolName, MainTimeframe, 672);

      if(handle_MA[i]    == INVALID_HANDLE || handle_Std[i]   == INVALID_HANDLE ||
         handle_RSI[i]   == INVALID_HANDLE || handle_ATR96[i] == INVALID_HANDLE ||
         handle_ATR672[i]== INVALID_HANDLE)  {
         Print(TradeComment + ": Failed to create indicator handles for ", SymbolsArray[i].SymbolName,
               "Check that all input currencies are visible in the MarketWatch Window");

         return INIT_FAILED;
        }
     }
     
     InitialBalance = AccountInfoDouble(ACCOUNT_BALANCE);
     
   return(INIT_SUCCEEDED);

}


void OnDeinit(const int reason){
    
    for(int i = 0; i < ArraySize(handle_MA); i++) {
        IndicatorRelease(handle_MA[i]);
        IndicatorRelease(handle_Std[i]);
        IndicatorRelease(handle_RSI[i]);
        IndicatorRelease(handle_ATR96[i]);
        IndicatorRelease(handle_ATR672[i]);
    }
    
    EventKillTimer();
    
    if(!MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_OPTIMIZATION))
    {
        ObjectsDeleteAll(0, -1);
    }
}


void OnTick() {

   if(!LicenseAllowed())
      return;

   bool isNewBarMainTF;
   bool isNewBarOPO;

   for(int i = 0 ; i < ArraySize(SymbolsArray) ; i++)
     {
      if(iTime(SymbolsArray[i].SymbolName,MainTimeframe,0) <= SymbolsArray[i].LastMainTFUpdate)
        {
         isNewBarMainTF = false;
        }
      else
        {
         SymbolsArray[i].LastMainTFUpdate = iTime(SymbolsArray[i].SymbolName,MainTimeframe,0);
         isNewBarMainTF = true;
        }
      if(isNewBarMainTF)
        {
         UpdateSymbolInfo(i);
         if( IsTradingAllowed() ) {
            CheckAndOpenGridOrders(i);
            ModifyGridTPsL(i);
            CheckAndCloseGrids(i);
         }
        }
        if ( iTime(SymbolsArray[i].SymbolName,OPO_TimeFrame,0) <= SymbolsArray[i].LastOPOTFUpdate )
         {
            isNewBarOPO = false;
         }
         else
         {
            SymbolsArray[i].LastOPOTFUpdate = iTime(SymbolsArray[i].SymbolName,OPO_TimeFrame,0);
            isNewBarOPO = true;
         }
         if ( isNewBarOPO )
         {
            SymbolsArray[i].OPOTriggered = false;
         }
     }
     
     PeriodicUpdate();
}


void OnTimer(){
   // Skip in testing/optimization mode
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION))
      return;
   
   // Update timer check
   LastTimerCheck = TimeCurrent();
   
   // Refresh time data for all symbols (keeps timeframes updated)
   for(int i = 0; i < ArraySize(SymbolsArray); i++)
   {
      iTime(SymbolsArray[i].SymbolName, MainTimeframe, 0);
      iTime(SymbolsArray[i].SymbolName, OPO_TimeFrame, 0);
   }

   LicenseTick();
}


void PeriodicUpdate()
{
    MqlDateTime tm;
    TimeToStruct(TimeCurrent(), tm);
    int currentTimeCode = tm.min + tm.hour * 100;

    // Refresh time data in non-testing mode
    if(!MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_OPTIMIZATION))
    {
        for(int i = 0; i < ArraySize(SymbolsArray); i++)
        {
            iTime(SymbolsArray[i].SymbolName, MainTimeframe, 0);
            iTime(SymbolsArray[i].SymbolName, OPO_TimeFrame, 0);
        }
    }
   // Check for closing conditions
   if((HideTP && !SmartTP) || HideSL ||
      (MaximumDrawdown > Epsilon && MaximumDrawdown < 99.99) ||
       MaximumDrawdownMoney > Epsilon)
   {
       for(int i = 0; i < ArraySize(SymbolsArray); i++)
       {
           CheckAndCloseGrids(i);
       }
   }
   // Main update - only once per minute
   if(LastUpdateMinute != currentTimeCode)
   {
       // Check if timer is stuck (more than 60 seconds)
       if(TimeCurrent() > LastTimerCheck + 60 && !MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_OPTIMIZATION))
       {
           LastTimerCheck = TimeCurrent();
           
           for(int i = 0; i < ArraySize(SymbolsArray); i++)
           {
               iTime(SymbolsArray[i].SymbolName, MainTimeframe, 0);
               iTime(SymbolsArray[i].SymbolName, OPO_TimeFrame, 0);
           }
       }

      // Check drawdown
      CheckMaxDrawdown();
      
      // Process trading if allowed
      if(MQLInfoInteger(MQL_TRADE_ALLOWED) && (MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION) || IsTradingAllowed()))
      {
          for(int i = 0; i < ArraySize(SymbolsArray); i++)
          {
              CheckAndOpenGridOrders(i);
              ModifyGridTPsL(i);
              CheckAndCloseGrids(i);
          }
      }
      
      LastUpdateMinute = currentTimeCode;
     }
     
}     



/*======================================================================================================
                                        Symbol Related Functions
======================================================================================================*/

bool ParseAndInitializeSymbols() {

   string symbols[];
   int symbolCount = StringSplit(Symbols, StringGetCharacter(",",0), symbols);

//   if(symbolCount > 0 && !MQLInfoInteger(MQL_TESTER))
   if(symbolCount > 0 && (!MQLInfoInteger(MQL_TESTER) || (TestAllCurrencies && !MQLInfoInteger(MQL_OPTIMIZATION))))
     {
      ArrayResize(SymbolsArray, symbolCount);

      for(int i = 0; i < symbolCount; i++)
        {
         string symbolName = symbols[i];
         StringTrimLeft(symbolName);
         StringTrimRight(symbolName);

         if(symbolName == "")
           {
            Print(TradeComment + ": List of Symbols is incorrect! Check it for extra commas!");
            SymbolsListError = true;
            return false;
           }
         InitializeSymbolData(i, symbolName);
         SymbolsArray[i].MaxGridLotMultiplier = CalculateMaxGridLotMultiplier(symbolName);
        }
     }
   else
     {
      ArrayResize(SymbolsArray, 1);
      string symbolName = Symbol();
      InitializeSymbolData(0, symbolName);
      SymbolsArray[0].MaxGridLotMultiplier = CalculateMaxGridLotMultiplier(symbolName);
     }

   return true;
  }
  
void InitializeSymbolData(int index, string symbolName) {

   SymbolsArray[index].SymbolName = symbolName;
   SymbolsArray[index].LastMainTFUpdate = 0;
   SymbolsArray[index].LastOPOTFUpdate = 0;
   SymbolsArray[index].UpdateCounter = 0;
   SymbolsArray[index].CanBuy = false;
   SymbolsArray[index].CanSell = false;
   SymbolsArray[index].CurrentBarTime = 0;
   SymbolsArray[index].PreviousBarTime = 0;
   SymbolsArray[index].ClosePrice = 0.0;
   SymbolsArray[index].GridOpened = false;
   SymbolsArray[index].OPOTriggered = false;
   SymbolsArray[index].SmartDistanceMultiplier = 1.0;
   SymbolsArray[index].BBWidth = 0.0;
   SymbolsArray[index].LastBarIndex = 0;
   SymbolsArray[index].CurrentBarIndex = 0;
   SymbolsArray[index].PatternValue = 0;
   SymbolsArray[index].PatternPrice = 0;
   SymbolsArray[index].PatternSearchActive = true;
   SymbolsArray[index].TradingAllowedToday = true;
   SymbolsArray[index].PreviousDayTradingAllowed = true;
   SymbolsArray[index].LastDayOfWeek = 0;
   SymbolsArray[index].LastBuyAvgPrice = 0.0;
   SymbolsArray[index].LastSellAvgPrice = 0.0;
   SymbolsArray[index].LastBuyTP = 0.0;
   SymbolsArray[index].LastSellTP = 0.0;

  }

void UpdateSymbolInfo(int symbolIndex){

   string symbol = SymbolsArray[symbolIndex].SymbolName;
   SymbolsArray[symbolIndex].UpdateCounter++;

   MqlDateTime tmCurrent;
   TimeToStruct(TimeCurrent(), tmCurrent);
   int currentHour = tmCurrent.hour;
   int currentMinute = tmCurrent.min;

   SymbolsArray[symbolIndex].CurrentBarTime = iTime(symbol, MainTimeframe, 0);
   SymbolsArray[symbolIndex].PreviousBarTime = SymbolsArray[symbolIndex].CurrentBarTime;

   bool canTrade = IsTradingAllowed() && AllowOpeningNewGrid;
   bool canBuy = canTrade;
   bool canSell = canTrade;

   // Check historical data

   if(iBars(symbol, MainTimeframe) < 1000)
     {
      Print(TradeComment + " " + symbol, ": Not enough historical data");
      canBuy = canSell = false;
     }

   // Check account balance
   if(AccountInfoDouble(ACCOUNT_MARGIN_FREE) < 10.0)
     {
      static datetime lastMarginMsg = 0;
      if(TimeCurrent() - lastMarginMsg > 3600)
        {
         Print(TradeComment + " " + symbol, ": Low margin: ", AccountInfoDouble(ACCOUNT_MARGIN_FREE));
         lastMarginMsg = TimeCurrent();
        }
      canBuy = canSell = false;
     }

   // Check UID
   if(UID < 0 || UID > 9)
     {
      static bool uidMsgPrinted = false;
      if(!uidMsgPrinted)
        {
         Print(TradeComment + " " + symbol, ": UID must be 0-9");
         uidMsgPrinted = true;
        }
      canBuy = canSell = false;
     }

   // Need at least 2 Bars updates before trading
   if(SymbolsArray[symbolIndex].UpdateCounter < 2)
      canBuy = canSell = false;

   // Check symbol trading mode
   int tradeMode = (int)SymbolInfoInteger(symbol, SYMBOL_TRADE_MODE);
   switch(tradeMode)
     {
      case SYMBOL_TRADE_MODE_DISABLED: canBuy = canSell = false; break;
      case SYMBOL_TRADE_MODE_LONGONLY: canSell = false; break;
      case SYMBOL_TRADE_MODE_SHORTONLY: canBuy = false; break;
     }

   // Apply user buy/sell restrictions
   if(AllowToBuySell == 1) canSell = false;
   if(AllowToBuySell == 2) canBuy = false;

   // Get bar times
   datetime barTime = SymbolsArray[symbolIndex].CurrentBarTime;

   MqlDateTime tmBar;
   TimeToStruct(barTime, tmBar);
   int barHour = tmBar.hour;
   int barMinute = tmBar.min;
   int barDay = tmBar.day;
   int barMonth = tmBar.mon;
   int barYear = tmBar.year;

   // Trading hours check

   int currentTimeCode = barMinute + barHour * 100;
   int startTimeCode = HourToStartTrading * 100;
   int stopTimeCode = HourToStopTrading * 100 + 59;

   bool timeOk;
   if(stopTimeCode >= startTimeCode)
      timeOk = (currentTimeCode >= startTimeCode && currentTimeCode <= stopTimeCode);
   else
      timeOk = (currentTimeCode >= startTimeCode || currentTimeCode <= stopTimeCode);

   // Holiday check - more realistic holiday dates
   if(!AllowTradingOnHolidays)
     {
      // Christmas to New Year week (Dec 25 - Jan 3)
      if((barMonth == 12 && barDay >= 25) || (barMonth == 1 && barDay <= 3))
         timeOk = false;
     }

   // Only trade at 15-min boundaries
   timeOk = timeOk && (barMinute == 0 || barMinute == 15 || barMinute == 30 || barMinute == 45);

   canBuy = canBuy && timeOk;
   canSell = canSell && timeOk;

   // Get close price
   SymbolsArray[symbolIndex].ClosePrice = iClose(symbol, MainTimeframe, 1);

   // Calculate indicators for trading signals
   double maBuffer[1], stdBuffer[1];
   CopyBuffer(handle_MA[symbolIndex],  0, 1, 1, maBuffer);
   CopyBuffer(handle_Std[symbolIndex], 0, 1, 1, stdBuffer);

   double bbMA    = maBuffer[0];
   double bbStd   = stdBuffer[0];
   double bbUpper = bbMA + 2 * bbStd;
   double bbLower = bbMA - 2 * bbStd;

   int highestBar = iHighest(symbol, MainTimeframe, MODE_HIGH, BollingerBandsPeriod + 1, 2);
   int lowestBar = iLowest(symbol, MainTimeframe, MODE_LOW, BollingerBandsPeriod + 1, 2);
   double recentHigh = iHigh(symbol, MainTimeframe, highestBar);
   double recentLow = iLow(symbol, MainTimeframe, lowestBar);

   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   SymbolsArray[symbolIndex].BBWidth = NormalizeDouble(bbUpper - bbLower, digits);

   // RSI filter
   if(RSI_Period > 0 && RSI_Value > 0)
     {
      double rsiBuffer[1];
      CopyBuffer(handle_RSI[symbolIndex], 0, 1, 1, rsiBuffer);
      double rsi = rsiBuffer[0];
      canBuy = canBuy && (rsi < 50 - RSI_Value);
      canSell = canSell && (rsi > 50 + RSI_Value);
     }

   // Price breakout signals
   double close = SymbolsArray[symbolIndex].ClosePrice;
   canBuy = canBuy && (close < recentLow && recentLow > 0);
   canSell = canSell && (close > recentHigh && recentHigh > 0);

   // Max symbols check
   int activeSymbols = 0;
   for(int i = 0; i < ArraySize(SymbolsArray); i++)
      if(GridExists(SymbolsArray[i].SymbolName, 0, 0))
         activeSymbols++;

   if(activeSymbols >= MaximumSymbols)
      canBuy = canSell = false;

   // Smart distance multiplier
   if(SmartDistance)
     {
      double atr96Buffer[1], atr672Buffer[1];
      CopyBuffer(handle_ATR96[symbolIndex],  0, 1, 1, atr96Buffer);
      CopyBuffer(handle_ATR672[symbolIndex], 0, 1, 1, atr672Buffer);
      double atr96  = atr96Buffer[0];
      double atr672 = atr672Buffer[0];

      if(atr672 > Epsilon)
         SymbolsArray[symbolIndex].SmartDistanceMultiplier = atr96 / atr672;

      // Clamp multiplier
      SymbolsArray[symbolIndex].SmartDistanceMultiplier = MathMin(1.5, MathMax(1.0, SymbolsArray[symbolIndex].SmartDistanceMultiplier));
     }

   // Day tracking
   int dayOfWeek = tmBar.day_of_week;
   if(dayOfWeek != SymbolsArray[symbolIndex].LastDayOfWeek && SymbolsArray[symbolIndex].LastDayOfWeek != 0)
     {
      SymbolsArray[symbolIndex].TradingAllowedToday = SymbolsArray[symbolIndex].PreviousDayTradingAllowed;
      SymbolsArray[symbolIndex].PreviousDayTradingAllowed = true;
   }
   SymbolsArray[symbolIndex].LastDayOfWeek = dayOfWeek;

   canBuy = canBuy && SymbolsArray[symbolIndex].TradingAllowedToday;
   canSell = canSell && SymbolsArray[symbolIndex].TradingAllowedToday;

   // Margin level check
   if(MinimumFreeMargin > Epsilon && AccountInfoDouble(ACCOUNT_MARGIN_LEVEL) < MinimumFreeMargin)
     {
      static datetime lastMarginLevelMsg = 0;
      if(TimeCurrent() - lastMarginLevelMsg > 1800)
        {
         Print(TradeComment + ": Low margin level: ", AccountInfoDouble(ACCOUNT_MARGIN_LEVEL));
         lastMarginLevelMsg = TimeCurrent();
        }
      canBuy = canSell = false;
     }

   // Drawdown checks
   CheckMaxDrawdown();

   // Apply drawdown restrictions
   if(DrawdownTriggered || StopTradingUntilRestart || DrawdownCooldownHours > 0)
     {
      static datetime lastDDMsg = 0;
      if(TimeCurrent() - lastDDMsg > 3600)
        {
         string reason;
         if(DrawdownTriggered)
            reason = "drawdown triggered";
         else if(StopTradingUntilRestart)
               reason = "drawdown - restart required";
            else
               reason = "drawdown cooldown " + IntegerToString(DrawdownCooldownHours) + "h";

         Print(TradeComment + " " + symbol, ": Trading blocked - ", reason);
         lastDDMsg = TimeCurrent();
        }
      canBuy = canSell = false;
     }

   // Update cooldown counter
   if(LastProcessedHour != currentHour)
      DrawdownCooldownHours--;
   if(DrawdownCooldownHours < 0) DrawdownCooldownHours = 0;

// Clear drawdown flag if no positions
   if(DrawdownTriggered)
     {
      double totLots = 0;
      for(int i = 0; i < ArraySize(SymbolsArray); i++)
         totLots += GetTotalLotsInGrid(SymbolsArray[i].SymbolName, -1, 0, false);

      if(totLots < Epsilon)
         DrawdownTriggered = false;
     }

   // Update symbol state
   SymbolsArray[symbolIndex].CanBuy = canBuy;
   SymbolsArray[symbolIndex].CanSell = canSell;
   SymbolsArray[symbolIndex].GridOpened = false;

   TickCounter++;
   LastProcessedHour = currentHour;

   // Try to open initial order
   SendInitialOrder(symbolIndex);
   
}

void SendInitialOrder(int symbolIndex){

   string symbol = SymbolsArray[symbolIndex].SymbolName;

   // Quick permission check
   if(!IsTradingAllowed() || (!SymbolsArray[symbolIndex].CanBuy && !SymbolsArray[symbolIndex].CanSell))
      return;

   // Check max symbols limit
   int activeSymbols = 0;
   for(int i = 0; i < ArraySize(SymbolsArray); i++)
      if(GridExists(SymbolsArray[i].SymbolName, 0, 0))
         activeSymbols++;

   if(activeSymbols >= MaximumSymbols) return;

   // Check spread
   double spread = (double)SymbolInfoInteger(symbol, SYMBOL_SPREAD);
   if(spread > MaximumSpread * GetPipMultiplier(symbol) && MaximumSpread > Epsilon)
     {
      Print(TradeComment + " " + symbol, ": Spread too high: ", spread);
      return;
     }

   // Try to open buy order
   if(SymbolsArray[symbolIndex].CanBuy)
     {
      bool hasPosition = AllowHedging ? !GridExists(symbol, -1, 1) : !GridExists(symbol, -1, 0);

      if(hasPosition)
         OpenMarketOrder(symbolIndex, ORDER_TYPE_BUY);
     }
   // Try to open sell order
   if(SymbolsArray[symbolIndex].CanSell)
     {
      bool hasPosition = AllowHedging ? !GridExists(symbol, -1, -1) : !GridExists(symbol, -1, 0);

      if(hasPosition)
         OpenMarketOrder(symbolIndex, ORDER_TYPE_SELL);
     }
}

void OpenMarketOrder(int symbolIndex, ENUM_ORDER_TYPE orderType) {

   string symbol = SymbolsArray[symbolIndex].SymbolName;
   int maxAttempts = 10;

   for(int attempt = 0; attempt < maxAttempts; attempt++)
     {
      double lotSize = CalculateLotSize(symbol, true);
      if(lotSize < Epsilon)
        {
         Print(TradeComment + " " + symbol, ": Lot size too small");
         return;
        }

      double margin = 0;
      if(!OrderCalcMargin(orderType, symbol, lotSize,
         (orderType == ORDER_TYPE_BUY) ? SymbolInfoDouble(symbol, SYMBOL_ASK) : SymbolInfoDouble(symbol, SYMBOL_BID),
         margin) || 
         margin <= 0 || 
         margin > AccountInfoDouble(ACCOUNT_MARGIN_FREE))
       {
         Print(TradeComment + " " + symbol, ": Not enough money");
         if(orderType == ORDER_TYPE_BUY)
            SymbolsArray[symbolIndex].CanBuy = false;
         else
            SymbolsArray[symbolIndex].CanSell = false;
         return;
        }

      // Calculate magic number
      int magicBase = MagicNumberBase + UID;                                             // 84570 + 0 = 84570
      int digits = StringLen(IntegerToString(magicBase));                                // 5
      int direction = (orderType == ORDER_TYPE_BUY) ? 1 : 2;                             // Buy => 1, Sell => 2
      int magic = (int)MathPow(10, digits + 2) * direction + magicBase * 100;            // 10^7 = 10000000 * 1 + 8457000
     


      string comment = TradeComment;

      Print(TradeComment + " " + symbol, ": Sending " + (orderType == ORDER_TYPE_BUY ? "buy" : "sell") +
            " order, attempt " + IntegerToString(attempt + 1));

      Trade.SetExpertMagicNumber(magic);
      Trade.SetDeviationInPoints(MaximumSlippage * GetPipMultiplier(symbol));

      bool success = (orderType == ORDER_TYPE_BUY) ? Trade.Buy(lotSize, symbol, 0, 0, 0, comment) :
                     Trade.Sell(lotSize, symbol, 0, 0, 0, comment);

      if(success){
         Print(TradeComment + " " + symbol, ": Order opened, id: ", Trade.ResultOrder());

         // Update state
         if(orderType == ORDER_TYPE_BUY)
           {
            SymbolsArray[symbolIndex].CanBuy = false;
            SymbolsArray[symbolIndex].LastBuyGridTime = TimeCurrent();
           }
         else
           {
            SymbolsArray[symbolIndex].CanSell = false;
            SymbolsArray[symbolIndex].LastSellGridTime = TimeCurrent();
           }
         SymbolsArray[symbolIndex].GridOpened = true;
         SymbolsArray[symbolIndex].OPOTriggered = true;

         return;
        }
      else
        {
         uint retcode = Trade.ResultRetcode();
         Print(TradeComment + " " + symbol, ": Failed to send order. Retcode: ", Trade.ResultRetcode(), " ",
               Trade.ResultRetcodeDescription());
         // Fatal errors - stop trying
         if(retcode == TRADE_RETCODE_INVALID         ||
            retcode == TRADE_RETCODE_INVALID_VOLUME  ||
            retcode == TRADE_RETCODE_NO_MONEY        ||
            retcode == TRADE_RETCODE_MARKET_CLOSED   ||
            retcode == TRADE_RETCODE_TRADE_DISABLED)
           {
            if(orderType == ORDER_TYPE_BUY)
               SymbolsArray[symbolIndex].CanBuy = false;
            else
               SymbolsArray[symbolIndex].CanSell = false;
            return;
           }
         Sleep(5000);
        }
     }
}


/*======================================================================================================
                                        Lot Size Functions
======================================================================================================*/

double CalculateLotSize(string symbol, bool isInitialOrder){

   double step = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   double minLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double limitLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_LIMIT);

   if(step < 0.0001) step = 0.001;
   
   // Get account values
   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   
   // Use fixed initial deposit for backtesting if enabled
   if(FixedInitialDeposit && MQLInfoInteger(MQL_TESTER) && InitialBalance > Epsilon)
   {
       freeMargin = InitialBalance;
       balance = InitialBalance;
       equity = InitialBalance;
   }
   
   // Get margin requirements with retry (preserving original behavior)
   double marginRequired = GetMarginRequired(symbol);
   double leverage = GetLeverage(symbol);
   
   double lotSize = 0;
   
// Calculate based on sizing method  
   switch(LotSizingMethod)
   {
       case FixedLots:
           lotSize = LotSizingValueFixed;
           break;
           
       case LotsBalance:
           lotSize = CalculateLotFromValue(balance, LotSizingValueDynamic, marginRequired, leverage, step);
           break;
           
       case LotsEquity:
           lotSize = CalculateLotFromValue(equity, -LotSizingValueDynamic, marginRequired, leverage, step);
           break;
           
       case LotsDepositLoad:
           lotSize = CalculateLotFromDepositLoad(freeMargin, marginRequired, leverage, step);
           break;
           
       case ExtremeRiskPreset: // 1.5% load
           lotSize = CalculateLotFromRisk(freeMargin, marginRequired, leverage, 1.5, step);
           break;
           
       case HighRiskPreset: // 1.0% load
           lotSize = CalculateLotFromRisk(freeMargin, marginRequired, leverage, 1.0, step);
           break;   
           
       case MidRiskPreset: // 0.5% load
           lotSize = CalculateLotFromRisk(freeMargin, marginRequired, leverage, 0.5, step);
           break;
        
       case LowRiskPreset: // 0.25% load
           lotSize = CalculateLotFromRisk(freeMargin, marginRequired, leverage, 0.25, step);
           break;
    }
    
    // Apply grid multiplier limit (preserving original logic)
   if(Initialized && !AutoSplit)
   {
       double maxGridMultiplier = GetMaxGridMultiplier();
       if((maxGridMultiplier + 1.0) * lotSize > maxLot * 2.0 && maxGridMultiplier + 1.0 > 1.0)
           lotSize = maxLot * 2.0 / (maxGridMultiplier + 1.0);
   }
   
   // For initial orders with GridLevelToStart > 1, use min lot (preserving original)
   if(GridLevelToStart > 1 && isInitialOrder)
       lotSize = minLot;   
   
   // Normalize lot size using the existing function
   lotSize = NormalizeLotSize(symbol, lotSize);

   return lotSize;    
}

double CalculateLotFromValue(double accountValue, double divisor, double marginRequired, double leverage, double step){
    
    if(divisor == 0 || marginRequired < Epsilon || leverage < Epsilon)
        return 0;
    
    double absDivisor = MathAbs(divisor);
    double lots = accountValue / absDivisor;
    lots = MathRound(lots * 0.01 / step) * step;
    
    return lots;
}

double CalculateLotFromDepositLoad(double freeMargin, double marginRequired, double leverage, double step){
    
    if(marginRequired < Epsilon || leverage < Epsilon || LotSizingDepositLoadPercent < Epsilon)
    {
        Print(TradeComment + ": Can't calculate lot size - missing margin/leverage data");
        return 0;
    }
    
    double lots = MathFloor(100.0 / leverage * freeMargin / marginRequired *
                            LotSizingDepositLoadPercent / 100.0 / step) * step;
    
    return lots;
}

double CalculateLotFromRisk(double freeMargin, double marginRequired, double leverage, double riskPercent, double step){
    
    if(marginRequired < Epsilon || leverage < Epsilon)
    {
        Print(TradeComment + ": Can't calculate lot size - missing margin/leverage data");
        return 0;
    }
    
    double lots = MathFloor(100.0 / leverage * freeMargin / marginRequired *
                            riskPercent / 100.0 / step) * step;
    
    return lots;
}


double NormalizeLotSize(string symbol, double lotSize){
    
    double step = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
    double minLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
    
    lotSize = MathRound(lotSize / step) * step;
    
    if(lotSize < minLot)
        lotSize = minLot;
    
    int digits = (int)(-MathLog10(step) + 0.5);
    return NormalizeDouble(lotSize, digits);
}

double GetMaxGridMultiplier(){
    
    double maxMultiplier = 0;
    for(int i = 0; i < ArraySize(SymbolsArray); i++)
    {
        if(SymbolsArray[i].MaxGridLotMultiplier > maxMultiplier)
            maxMultiplier = SymbolsArray[i].MaxGridLotMultiplier;
    }
    return maxMultiplier;
}

double CalculateMaxGridLotMultiplier(string symbolName){
    
    double startLot = 0.1;
    double totLots = 0.1;
    
    for(int level = 1; level <= MaximumTrades - 1; level++)
    {
        totLots = totLots + CalculateGridLotSize(symbolName, startLot, level, 0.0);
    }
    
    if(startLot > Epsilon)
        return totLots / startLot;
    else
        return 0.0;
}





/*======================================================================================================
                                        Grid Related Functions
======================================================================================================*/

void CheckAndOpenGridOrders(int symbolIndex){
    
    string symbol = SymbolsArray[symbolIndex].SymbolName;
    
    // Quick validation
    if(MaximumTrades <= 1 || TradeMultiplier_3rd <= 0 || TradeDistance <= Epsilon)
        return;
    
    double spread = (double)SymbolInfoInteger(symbol, SYMBOL_SPREAD);
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
    
    CheckGridDirection(symbolIndex, ORDER_TYPE_BUY, spread, point, digits);
    CheckGridDirection(symbolIndex, ORDER_TYPE_SELL, spread, point, digits);
}

void CheckGridDirection(int symbolIndex, ENUM_ORDER_TYPE orderType, double spread, double point, int digits){
    
    string symbol = SymbolsArray[symbolIndex].SymbolName;
    int direction = (orderType == ORDER_TYPE_BUY) ? 1 : -1;
    
    // Check if we have initial position
    if(!GridExists(symbol, 0, direction))
        return;
    
    double totLots = GetTotalLotsInGrid(symbol, 0, direction, false);
    double currentPrice = SymbolsArray[symbolIndex].ClosePrice;
    double avgPrice = GetWeightedAvgPrice(symbol, 0, direction);
    
   // Check each grid level
   for(int level = 1; level <= MaximumTrades - 1; level++)
   {
       // Skip if this level already exists
       if(GridExists(symbol, level, direction) || SymbolsArray[symbolIndex].GridOpened)
           continue;
           
   // Calculate required distance - MATCH ORIGINAL EXACTLY
   double requiredDistance = TradeDistance * level;
   
   // Convert to price distance
   double priceDistance = requiredDistance * point * GetPipMultiplier(symbol) *
                          SymbolsArray[symbolIndex].SmartDistanceMultiplier;
           
   double priceDiff = currentPrice - avgPrice;
   
   bool priceReached;
   if(orderType == ORDER_TYPE_BUY)
       priceReached = (priceDiff < -priceDistance);
   else
       priceReached = (priceDiff > priceDistance);   
       
   if(!priceReached)
       continue;
   
   // Calculate initial lot for GridLevelToStart feature
   double initialLot = 0;
   if(GridLevelToStart > 1)
       initialLot = GetTotalLotsInGrid(symbol, GridLevelToStart - 1, direction, false);        
           
   // Calculate lot size
   double lotSize = CalculateGridLotSize(symbol, totLots, level, initialLot);
   
   if(lotSize <= 0)
       continue;
   
   // Open the order
   if(OpenGridOrder(symbolIndex, orderType, level, lotSize))
   {
       SymbolsArray[symbolIndex].GridOpened = true;
       SymbolsArray[symbolIndex].OPOTriggered = true;
       Sleep(5000);
   }
  }               
}

bool OpenGridOrder(int symbolIndex, ENUM_ORDER_TYPE orderType, int level, double lotSize){

    string symbol = SymbolsArray[symbolIndex].SymbolName;

    // Check spread
    double spread = (double)SymbolInfoInteger(symbol, SYMBOL_SPREAD);
    if(spread > MaximumSpread * GetPipMultiplier(symbol) && MaximumSpread > Epsilon)
    {
        Print(TradeComment + " " + symbol, ": Spread too high for grid order: ", spread);
        return false;
    }

    // Check margin
    double margin = 0;
    if(!OrderCalcMargin(orderType, symbol, lotSize,
       (orderType == ORDER_TYPE_BUY) ? SymbolInfoDouble(symbol, SYMBOL_ASK) : SymbolInfoDouble(symbol, SYMBOL_BID),
       margin) || 
       margin <= 0 || 
       margin > AccountInfoDouble(ACCOUNT_MARGIN_FREE))
    {
        Print(TradeComment + " " + symbol, ": Not enough margin for grid order");
        return false;
    }

   // Handle auto-splitting if needed
       if(AutoSplit && lotSize > GetMaxLot(symbol))
           return SplitAndOpenOrders(symbolIndex, orderType, level, lotSize);
   
       // Open single order
       return SendGridOrder(symbolIndex, orderType, level, lotSize);
}

bool SendGridOrder(int symbolIndex, ENUM_ORDER_TYPE orderType, int level, double lotSize){

    string symbol = SymbolsArray[symbolIndex].SymbolName;

    // Calculate magic number
    int magic = CalculateGridMagicNumber(orderType, level);

   // Prepare comment
       string comment = TradeComment;
       if(level > 0)
           comment += " #" + IntegerToString(level);
   
       Trade.SetExpertMagicNumber(magic);
       Trade.SetDeviationInPoints(MaximumSlippage * GetPipMultiplier(symbol));
       bool success = (orderType == ORDER_TYPE_BUY) ? Trade.Buy(lotSize, symbol, 0, 0, 0, comment) :
                                                       Trade.Sell(lotSize, symbol, 0, 0, 0, comment);
   
       if(success)
       {
           Print(TradeComment + " " + symbol, ": Grid order opened, id: ", Trade.ResultOrder(), " level: ", level);
           if(orderType == ORDER_TYPE_BUY)
               SymbolsArray[symbolIndex].LastBuyGridTime = TimeCurrent();
           else
               SymbolsArray[symbolIndex].LastSellGridTime = TimeCurrent();
           return true;
       }
       else
       {
        Print(TradeComment + " " + symbol, ": Failed to open grid order. Retcode: ", Trade.ResultRetcode(), " ",
                                                                                      Trade.ResultRetcodeDescription());
        Sleep(1000);
        return false;
    }



}

int CalculateGridMagicNumber(ENUM_ORDER_TYPE orderType, int level){

    int magicBase = MagicNumberBase + UID;
    int digits = StringLen(IntegerToString(magicBase));
    int direction = (orderType == ORDER_TYPE_BUY) ? 1 : 2;

    return (int)MathPow(10, digits + 2) * direction + magicBase * 100 + level;
    
}



double GetWeightedAvgPrice(string symbol, int level, int direction){
      
   double totLots = 0;
   double totalPrice = 0;
   
   // Convert direction: 1=buy, -1=sell to our helper format (1=buy, 2=sell)
   int targetDir = (direction == 1) ? 1 : 2;
   
   // Loop through all orders
   for(int i = 0; i < PositionsTotal(); i++)
   {
       // Select the order
       if(!posInfo.SelectByIndex(i))
       {
           Print("OrderSelect failed: ", GetLastError());
           continue;
       }
       
       // Skip if wrong symbol
       if(posInfo.Symbol() != symbol) continue;
   
       // Get magic number
       int magic = (int)posInfo.Magic();
   
       // Is this our order? Use our helper!
       if(!g_magic.IsOurOrder(magic)) continue;
   
       // Is it the right direction?
       if(g_magic.GetDirectionFromMagic(magic) != targetDir) continue;
   
       // If level >= 0, only include that specific level
       if(level >= 0 && g_magic.GetLevelFromMagic(magic) != level) continue; 
       
      // Add to totals
          double lots = posInfo.Volume();
          totLots += lots;
          totalPrice += posInfo.PriceOpen() * lots;
      
          // Original behavior: if not AutoSplit, only take first order
          if(!AutoSplit) break;
      }
      // Calculate average
      if(totLots > Epsilon)
          return totalPrice / totLots;   
          
   return 0;        
}

double CalculateGridLotSize(string symbol, double currentTotalLots, int level, double initialLot){
    
    double step = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
    double minLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
    double maxLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
    double limitLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_LIMIT);
    
    if(step < 0.0001) step = 0.001;
    
    double result = minLot;
    double baseLot = currentTotalLots;
    
    // Handle GridLevelToStart feature
    if(GridLevelToStart > 1)
    {
        if(initialLot < 0.0099)
            initialLot = CalculateLotSize(symbol, false);
        if(level < GridLevelToStart - 1)
        {
            double multiplier = GetMultiplierForLevel(level);
            result = baseLot * multiplier;
        }
        else
        {
            if(KeepOriginalProfitLotSize && !AutoSplit)
             {
               if(level == GridLevelToStart - 1)
               {
                     result = initialLot;
               }
               else
               {
                    double startMultiplier = GetMultiplierForLevel(GridLevelToStart - 1);
                    double levelMultiplier = GetMultiplierForLevel(level);
                    result = (initialLot / startMultiplier) * levelMultiplier;
                }
             }
             else
             {
               int levelsFromStart = level - (GridLevelToStart - 1);
               double multiplier = GetMultiplierForLevel(levelsFromStart);
               result = initialLot * multiplier;
        }
    }
   }
   else
   {
       double multiplier = GetMultiplierForLevel(level);
       result = baseLot * multiplier;
   }
   
   // Round to step size
   int steps = (int)(result / step);
   result = steps * step;
   
   // Apply limits
   if(result < minLot)
       result = minLot;
   
   if(result > maxLot && !AutoSplit)
       result = maxLot;
   
   if(limitLot > Epsilon && result > limitLot)
       result = limitLot;
   
   // Normalize based on digits
   if(step < 0.001001 && step > 0.000999)              //If step is very close to 0.001 → normalize to 3 decimal places
       result = NormalizeDouble(result, 3);
   else if(step < 0.010001 && step > 0.009999)         //If step is very close to 0.01 → normalize to 2 decimal places
       result = NormalizeDouble(result, 2);
   else if(step < 0.100001 && step > 0.099999)         //If step is very close to 0.1 → normalize to 1 decimal place
       result = NormalizeDouble(result, 1);
   else if(step < 1.000001 && step > 0.999999)         //If step is very close to 1.0 → normalize to 0 decimal places
       result = NormalizeDouble(result, 0);   
  
   return result;           
}   

double GetMultiplierForLevel(int level){

    if(level <= 0) return 1.0;

    double mult = 1.0;
    for(int i = 1; i <= level; i++)
    {
        if(i == 1)
            mult *= TradeMultiplier_2nd;
        else if(i >= 2 && i <= 4)
            mult *= TradeMultiplier_3rd;
        else
            mult *= TradeMultiplier_6th;
    }
    return mult;
}     
         
         



bool GridExists(string symbol, int level, int direction){

   for(int i = 0; i < PositionsTotal(); i++)
   {
       if(!posInfo.SelectByIndex(i))
       {
           Print("OrderSelect failed: ", GetLastError());
           continue;
       }
       
       if(posInfo.Symbol() != symbol) continue;
       
       int magic = (int)posInfo.Magic();
       if(!g_magic.IsOurOrder(magic)) continue;
       
       int orderDirection = g_magic.GetDirectionFromMagic(magic);
       
      if(direction == 1 && orderDirection != 1) continue;
      if(direction == -1 && orderDirection != 2) continue;
      
      int orderLevel = g_magic.GetLevelFromMagic(magic);
      if(level >= 0 && orderLevel != level) continue;
      
      return true;
  }
   return false;
}

double GetTotalLotsInGrid(string symbol, int level, int direction, bool useOriginalLotSize = false) {
   
   double total = 0;
   double baseLot = 0;
   
   // Convert direction: 1=buy, -1=sell, 0=both
   int targetDir1 = (direction == 1 || direction == 0) ? 1 : -1;
   int targetDir2 = (direction == -1 || direction == 0) ? 2 : -1;
   
   // If using original profit lot size, find the base lot first
   if(useOriginalLotSize && GridLevelToStart > 1 && !AutoSplit)
   {
       baseLot = FindBaseLotForGrid(symbol, direction);
   }   
   
   // Loop through all orders
   for(int i = 0; i < PositionsTotal(); i++)
   {
       if(!posInfo.SelectByIndex(i)) continue;
   
       // Wrong symbol? Skip
       if(posInfo.Symbol() != symbol) continue;
   
       int magic = (int)posInfo.Magic();
   
       // Is this our order?
       if(!g_magic.IsOurOrder(magic)) continue;
   
       // Check direction
       int orderDir = g_magic.GetDirectionFromMagic(magic);
       bool dirMatch = (targetDir1 > 0 && orderDir == 1) || (targetDir2 > 0 && orderDir == 2);
       if(!dirMatch) continue;
   
       // Check level
       int orderLevel = g_magic.GetLevelFromMagic(magic);
       if(level >= 0 && orderLevel != level) continue;   
       
       // Get lot size
       double lots = posInfo.Volume();
   
       // Adjust lot size if using original profit size
       if(useOriginalLotSize && baseLot > 0)
       {
           lots = CalculateLotFromBase(baseLot, orderLevel);
       }
   
       total += lots;
       // Original behavior: if not AutoSplit and level specified, only take first
       if(!AutoSplit && level >= 0) break;
   }
   
   return total;     
}

double FindBaseLotForGrid(string symbol, int direction){

   // Convert direction: 1=buy, -1=sell
   int targetDir = (direction == 1) ? 1 : 2;
   
   for(int i = 0; i < PositionsTotal(); i++)
   {
       if(!posInfo.SelectByIndex(i)) continue;
   
       if(posInfo.Symbol() != symbol) continue;
   
       int magic = (int)posInfo.Magic();
   
       if(!g_magic.IsOurOrder(magic)) continue;
   
       if(g_magic.GetDirectionFromMagic(magic) != targetDir) continue;
   
       int level = g_magic.GetLevelFromMagic(magic);
       if(level == GridLevelToStart - 1)
       {
           double lot = posInfo.Volume();
           double multiplier = GetMultiplierForLevel(level);
           return (multiplier > 0) ? lot / multiplier : 0;
       }
   }
   return 0;
}

double CalculateLotFromBase(double baseLot, int level){

    if(baseLot <= 0) return 0;
    return baseLot * GetMultiplierForLevel(level);
}




/*======================================================================================================
                                        TP & SL Related Functions
======================================================================================================*/

void ModifyGridTPsL(int symbolIndex){

   string symbol = SymbolsArray[symbolIndex].SymbolName;
   
   if(PositionsTotal() == 0) return;
   
   // Calculate magic number prefixes
   int magicBase = MagicNumberBase + UID;
   int digits = StringLen(IntegerToString(magicBase));
   int buyPrefix = magicBase + (int)MathPow(10.0, digits);       // =? 184570
   int sellPrefix = magicBase + (int)MathPow(10.0, digits) * 2;  // => 284570
   
   // Don't modify if drawdown triggered
   if(DrawdownTriggered) return;
   
   for(ENUM_POSITION_TYPE posType = POSITION_TYPE_BUY; posType <= POSITION_TYPE_SELL; posType++)
   {
       for(int i = PositionsTotal() - 1; i >= 0; i--)
       {
           if(!posInfo.SelectByIndex(i))
           {
               Print(TradeComment + " " + symbol, ": Failed to select position! Error=", GetLastError());
               continue;
           }
           int                 ticket       = (int)posInfo.Ticket();
           ENUM_POSITION_TYPE  type         = posInfo.PositionType();
           string              orderSymbol  = posInfo.Symbol();
           double              lots         = posInfo.Volume();
           int                 magic        = (int)posInfo.Magic();
           double              tp           = posInfo.TakeProfit();
           double              sl           = posInfo.StopLoss();
           datetime            openTime     = posInfo.Time();
           double              openPrice    = posInfo.PriceOpen();
           double              commisson    = posInfo.Commission();
           double              swap         = posInfo.Swap();

   // Calculate commission adjustment
   double commissionAdjust = 0.0;
   if(SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE) * lots > Epsilon)
   {
       int dig = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
       double commSwap = (commisson + swap) / (SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE) * lots);
       double point = (SymbolInfoDouble(symbol, SYMBOL_POINT) > Epsilon) ? SymbolInfoDouble(symbol, SYMBOL_POINT) : 0.00001;
       commSwap = commSwap * point;
       commissionAdjust = NormalizeDouble(commSwap, dig);
   }

   // Modify buy orders
   if(posType == POSITION_TYPE_BUY && type == POSITION_TYPE_BUY && orderSymbol == symbol && magic / 100 == buyPrefix)
   {
       ModifyBuyOrder(symbolIndex, ticket, type, orderSymbol, lots, magic, tp, sl, openTime, openPrice, commissionAdjust);
   }
   // Modify sell orders
   if(posType == POSITION_TYPE_SELL && type == POSITION_TYPE_SELL && orderSymbol == symbol && magic / 100 == sellPrefix)
   {
       ModifySellOrder(symbolIndex, ticket, type, orderSymbol, lots, magic, tp, sl, openTime, openPrice, commissionAdjust);
   }
  }
 }
}

void ModifyBuyOrder(int symbolIndex, int ticketNumber, int orderType, string symbol, double lotSize,
                    int magicNumber, double currentTP, double currentSL, datetime openTime, double openPrice, double commissionAdjust){

    double      newSL = 0.0;
    double      newTP = 0.0;
    int         magicBase;
    int         magicBaseDigits;
    int         buyPrefix;
    double      levelFromMagic;
    double      avgPrice;
    double      avgPriceWithCommissions;
    double      tpDistance;
    double      totalLotsInGrid;
    int         startLevel;
    double      startLevelLots;
    int         smartTPLevel;
    double      smartTPFactor;
    int         modifyAttempt;
    double      stopLevelPrice;
    double      freezeLevelPrice;
    bool        hasValidTPorSL;
    //----- -----
    double      tempLevel;
    double      tempPoint;

   if ( ( DoNotAdjustTPUnlessNewGrid && TimeCurrent() - SymbolsArray[symbolIndex].LastBuyGridTime > 300 ) )
      return;
   
   magicBase=MagicNumberBase + UID;
   magicBaseDigits=StringLen(IntegerToString(magicBase,0,32));
   buyPrefix=magicBase + int(MathPow(10.0,magicBaseDigits));
   levelFromMagic=(int)(magicNumber - buyPrefix * 100);
   
   avgPrice = openPrice ;
   avgPriceWithCommissions = openPrice ;
   
   if ( MaximumTrades - 1 >  0 && TradeMultiplier_3rd>0.0 && TradeDistance>Epsilon )
   {
      if ( GridExists(symbol,0,1) )
      {
         avgPrice = NormalizeDouble(GetWeightedAvgPrice(symbol,0,1),(int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)) ;
         SymbolsArray[symbolIndex].LastBuyAvgPrice = avgPrice;
      }
      else
      {
         if ( SymbolsArray[symbolIndex].LastBuyAvgPrice>Epsilon )
         {
            avgPrice = SymbolsArray[symbolIndex].LastBuyAvgPrice ;
         }
      }
      avgPriceWithCommissions = NormalizeDouble(GetWeightedAvgPriceWithCommissions(symbol,1,true,false),
                                (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)) ;
      
      if ( KeepOriginalProfitLotSize && GridLevelToStart > 1 && !(AutoSplit) )
      {
         avgPriceWithCommissions = NormalizeDouble(GetWeightedAvgPriceWithCommissions(symbol,1,true,true),
                                   (int)SymbolInfoInteger(symbol,SYMBOL_DIGITS)) ;
      }
   }

   newTP = CalculateTakeProfit(symbolIndex,avgPriceWithCommissions,1,false,currentTP) ;
   newSL = CalculateStopLoss(symbolIndex,avgPrice,1) ;

   if ( WeightedTP )
   {
      tpDistance = newTP - avgPriceWithCommissions ;
      if ( GridExists(symbol,0,1) )
      {
         totalLotsInGrid = GetTotalLotsInGrid(symbol,-1,1,false) ;
         if ( KeepOriginalProfitLotSize && GridLevelToStart >  1 && !(AutoSplit) )
         {
            totalLotsInGrid = GetTotalLotsInGrid(symbol,-1,1,true) ;
         }
         if ( totalLotsInGrid>Epsilon )
         {
            startLevel = 0 ;
            if ( GridLevelToStart >  1 && !(KeepOriginalProfitLotSize) && GetTotalLotsInGrid(symbol,GridLevelToStart - 1,1,false)>Epsilon )
            {
               startLevel=GridLevelToStart - 1;
            }
            startLevelLots = GetTotalLotsInGrid(symbol,startLevel,1,false) ;
            if ( KeepOriginalProfitLotSize && GridLevelToStart >  1 && !(AutoSplit) )
            {
               startLevelLots = GetTotalLotsInGrid(symbol,0,1,true) ;
            }
            startLevelLots = startLevelLots / totalLotsInGrid ;
            tpDistance = startLevelLots * tpDistance ;
            newTP = NormalizeDouble(tpDistance + avgPriceWithCommissions,(int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)) ; 
         }
      }
   }
   
   if ( SmartTP && SymbolsArray[symbolIndex].BBWidth>Epsilon && GridExists(symbol,0,1) && GridLevelToStart == 1 )
   {
      smartTPLevel = 2 ;
      smartTPFactor = InitialTP / 100.0 ;
   
      if ( !(GridExists(symbol,2,1)) )    //TP = 0.10 × (level - 2) × 0.0100 + openPrice — targets a small distance based on how deep we
      {
         avgPriceWithCommissions = openPrice ;
         newTP = smartTPFactor * (levelFromMagic - 2) * SymbolsArray[symbolIndex].BBWidth + openPrice ;
      }
      else
      {
         if ( !(GridExists(symbol,smartTPLevel + 3,1)) )         // Level 3-5 = 10% of the BB Width
         {
            newTP = smartTPFactor * SymbolsArray[symbolIndex].BBWidth + avgPriceWithCommissions ;
         }
         else
         {
            newTP = smartTPFactor / 2.0 * SymbolsArray[symbolIndex].BBWidth + avgPriceWithCommissions ;
         }
      }
      newTP = NormalizeDouble(newTP,(int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)) ;
   }
   
   if ( GridExists(symbol,0,1) )
   {
      SymbolsArray[symbolIndex].LastBuyTP = newTP;
   }
   
   for (modifyAttempt = 0 ; modifyAttempt < 5 ; modifyAttempt ++)
   {
   tempLevel = (double)SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL);
   tempPoint = SymbolInfoDouble(symbol, SYMBOL_POINT);
   
   stopLevelPrice = tempLevel * tempPoint ;
   
   tempLevel = (double)SymbolInfoInteger(symbol, SYMBOL_TRADE_FREEZE_LEVEL);
   freezeLevelPrice = tempLevel * tempPoint ;
   
   if ( newSL>Epsilon )
   {
      if ( stopLevelPrice>Epsilon && currentSL<Epsilon )
      {
         newSL = MathMin(SymbolInfoDouble(symbol, SYMBOL_BID) - stopLevelPrice,newSL) ;
      }
      if ( stopLevelPrice<Epsilon )
      {
         newSL = MathMin(SymbolInfoDouble(symbol, SYMBOL_BID),newSL) ;
      }
   }
   
   if ( newTP>Epsilon )
   {
      if ( stopLevelPrice>Epsilon && currentTP<Epsilon )
      {
         newTP = MathMax(SymbolInfoDouble(symbol, SYMBOL_BID) + stopLevelPrice,newTP) ;
      }
      if ( stopLevelPrice<Epsilon )
      {
         newTP = MathMax(SymbolInfoDouble(symbol, SYMBOL_BID),newTP) ;
      }
   }
   
   if ( HideSL )
   {
      newSL = 0.0 ;
   }
   if ( ( HideTP || Use_OPO_Method ) && !(SmartTP) )
   {
      newTP = 0.0 ;
   }
   
   hasValidTPorSL = true ;
   if ( newTP<Epsilon && !(HideTP) && !(Use_OPO_Method) )
   {
      hasValidTPorSL = false ;
   }
   if ( newTP<Epsilon && SmartTP )
   {
      hasValidTPorSL = false ;
   }
   if ( newSL<Epsilon && !(HideSL) )
   {
      hasValidTPorSL = false ;
   }
   
   if ( (!MathAbs(currentTP - newTP)>=(SymbolInfoDouble(symbol, SYMBOL_POINT) * 2.0) &&
       !MathAbs(currentSL - newSL)>=(SymbolInfoDouble(symbol, SYMBOL_POINT) * 2.0) )
        || !(hasValidTPorSL) )
            continue;
   if ( MathAbs(currentTP - newTP)<=tempPoint )
   {
      newTP = currentTP ;
   }
   if ( MathAbs(currentSL - newSL)<=tempPoint )
   {
      newSL = currentSL ;
   }
   
   newSL = NormalizeDouble(newSL,(int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)) ;
   newTP = NormalizeDouble(newTP,(int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)) ;
   
   if ( ValidateOrderModification(symbol,3,ORDER_TYPE_BUY,openPrice,currentSL,currentTP,openPrice,newSL,newTP) )
   {
      Print(TradeComment + " " + symbol,": Modifying buy trade: " + IntegerToString(ticketNumber) +
            ", attempt N", IntegerToString(modifyAttempt + 1));
      if(!Trade.PositionModify(ticketNumber, newSL, newTP))
      {
         Print(TradeComment + " " + symbol, ": Failed to modify buy trade: ", ticketNumber,
               ". Retcode=", Trade.ResultRetcode(), " ", Trade.ResultRetcodeDescription());
         Sleep(5000);
         continue;
      }
    Print(TradeComment + " " + symbol,": Buy trade: " + IntegerToString(ticketNumber) + " successfully modified");
    return;
   }
   Sleep(5000);
  }
}
 
 
 
void ModifySellOrder(int symbolIndex, int ticketNumber, int orderType, string symbol, double lotSize, int magicNumber,
                     double currentTP, double currentSL, datetime openTime, double openPrice, double commissionAdjust){

   double      newSL = 0.0;
   double      newTP = 0.0;
   int         magicBase;
   int         magicBaseDigits;
   int         sellPrefix;
   double      levelFromMagic;
   double      avgPrice;
   double      avgPriceWithCommissions;
   double      tpDistance;
   double      totalLotsInGrid;
   int         startLevel;
   double      startLevelLots;
   int         smartTPLevel;
   double      smartTPFactor;
   int         modifyAttempt;
   double      stopLevelPrice;
   double      freezeLevelPrice;
   bool        hasValidTPorSL;
   //----- -----
   double      tempLevel=0;
   double      tempPoint=0;

   if ( ( DoNotAdjustTPUnlessNewGrid && TimeCurrent() - SymbolsArray[symbolIndex].LastSellGridTime > 300 ) )   return;

      magicBase=MagicNumberBase + UID;
      magicBaseDigits=StringLen(IntegerToString(magicBase,0,32));
      sellPrefix=magicBase + int(MathPow(10.0,magicBaseDigits)) * 2;
      levelFromMagic=(int)(magicNumber - sellPrefix * 100);
      avgPrice = openPrice ;
      avgPriceWithCommissions = openPrice ;
      
      if ( MaximumTrades - 1 >  0 && TradeMultiplier_3rd>0.0 && TradeDistance>Epsilon )
      {
         if ( GridExists(symbol,0,-1) )
         {
            avgPrice = NormalizeDouble(GetWeightedAvgPrice(symbol,0,-1),(int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)) ;
            SymbolsArray[symbolIndex].LastSellAvgPrice = avgPrice;
         }
         else
         {
            if ( SymbolsArray[symbolIndex].LastSellAvgPrice>Epsilon )
            {
               avgPrice = SymbolsArray[symbolIndex].LastSellAvgPrice ;
            }
         }
         avgPriceWithCommissions = NormalizeDouble(GetWeightedAvgPriceWithCommissions(symbol,-1,true,false),
                                                   (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)) ;
         if ( KeepOriginalProfitLotSize && GridLevelToStart >  1 && !(AutoSplit) )
         {
            avgPriceWithCommissions = NormalizeDouble(GetWeightedAvgPriceWithCommissions(symbol,-1,true,true),
                                                      (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)) ;
         }
      }   
             
      newTP = CalculateTakeProfit(symbolIndex,avgPriceWithCommissions,-1,false,currentTP) ;
      newSL = CalculateStopLoss(symbolIndex,avgPrice,-1) ;
      
      if ( WeightedTP )
      {
         tpDistance = avgPriceWithCommissions - newTP ;
         if ( GridExists(symbol,0,-1) )
         {
            totalLotsInGrid = GetTotalLotsInGrid(symbol,-1,-1,false) ;
            if ( KeepOriginalProfitLotSize && GridLevelToStart >  1 && !(AutoSplit) )
            {
               totalLotsInGrid = GetTotalLotsInGrid(symbol,-1,-1,true) ;
            }
            if ( totalLotsInGrid>Epsilon )
            {
               startLevel = 0 ;
               if ( GridLevelToStart >  1 && !(KeepOriginalProfitLotSize) && GetTotalLotsInGrid(symbol,GridLevelToStart - 1,-1,false)>Epsilon)
               {
                  startLevel=GridLevelToStart - 1;
               }
               startLevelLots = GetTotalLotsInGrid(symbol,startLevel,-1,false) ;
               if ( KeepOriginalProfitLotSize && GridLevelToStart >  1 && !(AutoSplit) )
               {
                  startLevelLots = GetTotalLotsInGrid(symbol,0,-1,true) ;
               }
               startLevelLots = startLevelLots / totalLotsInGrid ;
               tpDistance = startLevelLots * tpDistance ;
               newTP = NormalizeDouble(avgPriceWithCommissions - tpDistance,(int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)) ;
            }
         }             
        }
        
      if ( SmartTP && SymbolsArray[symbolIndex].BBWidth>Epsilon && GridExists(symbol,0,-1) && GridLevelToStart == 1 )
      {
         smartTPLevel = 2 ;
         smartTPFactor = InitialTP / 100.0 ;
         if ( !(GridExists(symbol,2,-1)) )
         {
            avgPriceWithCommissions = openPrice ;
            newTP = openPrice - smartTPFactor * (levelFromMagic - 2) * SymbolsArray[symbolIndex].BBWidth ;
         }
         else
         {
            if ( !(GridExists(symbol,smartTPLevel + 3,-1)) )
            {
               newTP = avgPriceWithCommissions - smartTPFactor * SymbolsArray[symbolIndex].BBWidth ;
            }
            else
            {
               newTP = avgPriceWithCommissions - smartTPFactor / 2.0 * SymbolsArray[symbolIndex].BBWidth ;
            }
         }
         newTP = NormalizeDouble(newTP,(int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)) ;
      }             

      if ( GridExists(symbol,0,-1) )
      {
         SymbolsArray[symbolIndex].LastSellTP = newTP;
      }
      
      for (modifyAttempt = 0 ; modifyAttempt < 5 ; modifyAttempt ++)
      {
         tempLevel = (double)SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL);
         stopLevelPrice = tempLevel * tempPoint ;
      
         tempLevel = (double)SymbolInfoInteger(symbol, SYMBOL_TRADE_FREEZE_LEVEL);
         freezeLevelPrice = tempLevel * tempPoint ;

         if ( newSL>Epsilon )
         {
            if ( stopLevelPrice>Epsilon && currentSL<Epsilon )
            {
               newSL = MathMax(SymbolInfoDouble(symbol, SYMBOL_ASK) + stopLevelPrice,newSL) ;
            }
            if ( stopLevelPrice<Epsilon )
            {
               newSL = MathMax(SymbolInfoDouble(symbol, SYMBOL_ASK),newSL) ;
            }
         }
         if ( newTP>Epsilon )
         {
            if ( stopLevelPrice>Epsilon && currentTP<Epsilon )
            {
               newTP = MathMin(SymbolInfoDouble(symbol, SYMBOL_ASK) - stopLevelPrice,newTP) ;
            }
            if ( stopLevelPrice<Epsilon )
            {
               newTP = MathMin(SymbolInfoDouble(symbol, SYMBOL_ASK),newTP) ;
            }
         }
         
         if ( HideSL )
         {
            newSL = 0.0 ;
         }
         if ( ( HideTP || Use_OPO_Method ) && !(SmartTP) )
         {
            newTP = 0.0 ;
         }
         hasValidTPorSL = true ;
         if ( newTP<Epsilon && !(HideTP) && !(Use_OPO_Method) )
         {
            hasValidTPorSL = false ;
         }
         if ( newTP<Epsilon && SmartTP )
         {
            hasValidTPorSL = false ;
         }
         if ( newSL<Epsilon && !(HideSL) )
         {
            hasValidTPorSL = false ;
         }
         
         if ( (!MathAbs(currentTP - newTP)>=(SymbolInfoDouble(symbol, SYMBOL_POINT) * 2.0) &&
       !MathAbs(currentSL - newSL)>=(SymbolInfoDouble(symbol, SYMBOL_POINT) * 2.0) )
        || !(hasValidTPorSL) )
            continue;

         if ( MathAbs(currentTP - newTP)<=tempPoint )
         {
            newTP = currentTP ;
         }
         if ( MathAbs(currentSL - newSL)<=tempPoint )
         {
            newSL = currentSL ;
         }
         
         
         newSL = NormalizeDouble(newSL,(int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)) ;
         newTP = NormalizeDouble(newTP,(int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)) ;
         
         if ( ValidateOrderModification(symbol,3,ORDER_TYPE_SELL,openPrice,currentSL,currentTP,openPrice,newSL,newTP) )
         {
            Print(TradeComment + " " + symbol,": Modifying sell trade: " + IntegerToString(ticketNumber,0,32) + ", attempt N", IntegerToString(modifyAttempt + 1));
         
            if(!Trade.PositionModify(ticketNumber, newSL, newTP))
            {
               Print(TradeComment + " " + symbol, ": Failed to modify sell trade: ", ticketNumber,
                     ". Retcode=", Trade.ResultRetcode(), " ", Trade.ResultRetcodeDescription());
               Sleep(5000);
               continue;
            }
         
            Print(TradeComment + " " + symbol,": Sell trade: " + IntegerToString(ticketNumber,0,32) + " successfully modified");
            return;
         }
         Sleep(5000);
         }
}

bool ValidateOrderModification(string symbol, int modificationType, ENUM_ORDER_TYPE orderType,
                               double openPrice, double oldSL, double oldTP,
                               double newOpenPrice, double newSL, double newTP){


   // Don't validate on first tick
   if(TickCounter == 0)
      return false;
   
   // Avoid modification during first minute of new hour (prevents spikes)
   if(!MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_OPTIMIZATION))
   {
       MqlDateTime tm;
       TimeToStruct(TimeCurrent(), tm);
       int currentHour   = tm.hour;
       int currentMinute = tm.min;
   
       if(currentHour == 0 && currentMinute <= 1) //start of new day
           return false;
   
       // Monday morning filter (5 minutes after hour 0)
       if(currentHour == 0 && currentMinute <= 5 && tm.day_of_week == 1) //start on Monday
           return false;
   }

   // Get market info
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
   double spread = ask - bid;
   double stopLevel = (double)SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL) * point;
   double freezeLevel = (double)SymbolInfoInteger(symbol, SYMBOL_TRADE_FREEZE_LEVEL) * point;
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   
   // Normalize all prices
   openPrice = NormalizeDouble(openPrice, digits);
   oldSL = NormalizeDouble(oldSL, digits);
   oldTP = NormalizeDouble(oldTP, digits);
   newSL = NormalizeDouble(newSL, digits);
   newTP = NormalizeDouble(newTP, digits);

   // For closing orders
   if(modificationType == 1)
   {
       if(orderType == ORDER_TYPE_BUY)
       {
           if(NormalizeDouble(bid - openPrice, digits) <= stopLevel && openPrice > point)
               return false;
       }
       else // Order_type_Sell
       {
           if(NormalizeDouble(openPrice - ask, digits) <= stopLevel && openPrice > point)
               return false;
       }
       return true;
   }
   
   // For modifying SL/TP
   if(modificationType == 2 || modificationType == 3)
   {
       // Check SL validity
       if(newSL > Epsilon)
       {
           if(orderType == ORDER_TYPE_BUY)
           {
               if(NormalizeDouble(bid - newSL, digits) < stopLevel - point)
                   return false;
               if(newSL > bid - point)
                   return false;
           }
           else // Order_type_Sell
           {
               if(NormalizeDouble(newSL - ask, digits) < stopLevel - point)
                   return false;
               if(newSL < ask + point)
                   return false;
           }
       }
      // Check TP validity
          if(newTP > Epsilon)
          {
              if(orderType == ORDER_TYPE_BUY)
              {
                  if(NormalizeDouble(newTP - ask, digits) < stopLevel - point)
                      return false;
                  if(newTP < ask + point)
                      return false;
              }
              else // Order_type_Sell
              {
                  if(NormalizeDouble(bid - newTP, digits) < stopLevel - point)
                      return false;
                  if(newTP > bid - point)
                      return false;
              }
          }
         // Check freeze level (can't modify if price is frozen)
             if(freezeLevel > point)
             {
                 if(orderType == ORDER_TYPE_BUY)
                 {
                     if(MathAbs(bid - openPrice) <= freezeLevel)
                         return false;
                 }
                 else // Order_type_Sell
                 {
                     if(MathAbs(ask - openPrice) <= freezeLevel)
                         return false;
                 }
             }
         }      
         return true;
} 
 
 
double CalculateTakeProfit(int symbolIndex, double basePrice, int direction, bool isGridOrder, double oldTP){

    string symbol = SymbolsArray[symbolIndex].SymbolName;

    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
    
   // Determine pip multiplier based on digits
   int pipMultiplier = (digits == 5 || digits == 3) ? 10 : 1;
   
   // Get base TP distance in price
   double tpDistance = 0;
   
   // Check if we should use grid TP
   bool useGridTP = false;
   if(isGridOrder && !WeightedTP)
   {
       double gridLots = GetTotalLotsInGrid(symbol, 1, direction, false);
       if(gridLots > Epsilon)
           useGridTP = true;
   }    
    
   if(useGridTP && GridTP > Epsilon)
   {
       tpDistance = GridTP * point * pipMultiplier;
   }
   else
   {
       tpDistance = InitialTP * point * pipMultiplier;
   }    
    
   // Default to 1000 pips if nothing set
   if(tpDistance < Epsilon)
      tpDistance = 1000 * point * pipMultiplier;
   
   // Check break-even after certain level
   if(BreakEvenAfterThisLevel > 0)
   {
       double breakEvenLots = GetTotalLotsInGrid(symbol, BreakEvenAfterThisLevel - 1, direction, false);
       if(breakEvenLots > Epsilon)
           tpDistance = 0;
   }    
    
   // Calculate TP price based on direction
   double tpPrice;
   if(direction == 1) // Buy
      tpPrice = basePrice + tpDistance;
   else // Sell
      tpPrice = basePrice - tpDistance;
   
   // Round to tick size if specified
   if(tickSize > 0)
      tpPrice = MathRound(tpPrice / tickSize) * tickSize;
   
   return NormalizeDouble(tpPrice, digits);        
}

double CalculateStopLoss(int symbolIndex, double basePrice, int direction){

    string symbol = SymbolsArray[symbolIndex].SymbolName;

    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);

    // Determine pip multiplier based on digits
    int pipMultiplier = (digits == 5 || digits == 3) ? 10 : 1;

    // Get SL distance in price
    double slDistance = GridSL * point * pipMultiplier;

    // Default to 1000 pips if not set
    if(slDistance < Epsilon)
        slDistance = 1000 * point * pipMultiplier;

   // Calculate SL price based on direction
   double slPrice;
   if(direction == 1) // Buy
      slPrice = basePrice - slDistance;
   else // Sell
      slPrice = basePrice + slDistance;
   
   // Round to tick size if specified
   if(tickSize > 0)
      slPrice = MathRound(slPrice / tickSize) * tickSize;
   
   return NormalizeDouble(slPrice, digits);
}


double GetWeightedAvgPriceWithCommissions(string symbol, int direction, bool includeCommissions, bool useOriginalLotSize){
  
   double totLots = 0;
   double totalPrice = 0;
   double baseLot = 0;
   
   // Convert direction: 1=buy, -1=sell to helper format (1=buy, 2=sell)
   int targetDir = (direction == 1) ? 1 : 2;
   ENUM_ORDER_TYPE orderType = (direction == 1) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   
   // If using original profit lot size, find the base lot first
   if(useOriginalLotSize && KeepOriginalProfitLotSize && GridLevelToStart > 1 && !AutoSplit)
   {
       baseLot = FindBaseLotForGridWithCommissions(symbol, direction);
   }  
  
   // Loop through all orders
   for(int i = 0; i < PositionsTotal(); i++)
   {
       if(!posInfo.SelectByIndex(i))
       {
           Print("OrderSelect failed: ", GetLastError());
           continue;
       }
   
       // Wrong symbol? Skip
       if(posInfo.Symbol() != symbol) continue;
   
       int magic = (int)posInfo.Magic();
   
       // Is this our order?
       if(!g_magic.IsOurOrder(magic)) continue;
   
       // Is it the right direction?
       if(g_magic.GetDirectionFromMagic(magic) != targetDir) continue;  
  
      // Get order info
          double lots = posInfo.Volume();
          double openPrice = posInfo.PriceOpen();
          int level = g_magic.GetLevelFromMagic(magic);
      
          // Adjust lot size if using original profit size
          if(useOriginalLotSize && baseLot > 0 && KeepOriginalProfitLotSize && GridLevelToStart > 1 && !AutoSplit)
          {
              if(level == 0)
                  lots = baseLot;
              else if(level > 0)
                  lots = baseLot * GetMultiplierForLevel(level);
          }
      
          // Adjust price for commissions if requested
          double adjustedPrice = openPrice;
          if(includeCommissions)
          {
              adjustedPrice = GetPriceWithCommission(symbol, orderType, openPrice, lots, posInfo.Commission(), posInfo.Swap());
          }  
          
            totLots += lots;
                totalPrice += adjustedPrice * lots;
            }
            
            // Calculate average
            if(totLots > Epsilon)
                return NormalizeDouble(totalPrice / totLots, (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS));
            
            return 0;                  
}

double GetPriceWithCommission(string symbol, ENUM_ORDER_TYPE orderType, double openPrice, double lots, double commission, double swap){

    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);

    if(tickValue * lots <= Epsilon)
        return openPrice;

    // Calculate commission and swap in price terms
    double totalCost = commission + swap;
    double priceAdjustment = totalCost / (tickValue * lots) * point;

    if(orderType == ORDER_TYPE_BUY)
        return NormalizeDouble(openPrice + point - priceAdjustment, digits);
    else // OP_SELL
        return NormalizeDouble(openPrice - point + priceAdjustment, digits);
}

double FindBaseLotForGridWithCommissions(string symbol, int direction){

    int targetDir = (direction == 1) ? 1 : 2;

    for(int i = 0; i < PositionsTotal(); i++)
    {
        if(!posInfo.SelectByIndex(i)) continue;

        if(posInfo.Symbol() != symbol) continue;

        int magic = (int)posInfo.Magic();

        if(!g_magic.IsOurOrder(magic)) continue;

        if(g_magic.GetDirectionFromMagic(magic) != targetDir) continue;

        int level = g_magic.GetLevelFromMagic(magic);

        if(level >= GridLevelToStart - 1)
        {
            double lot = posInfo.Volume();
            double multiplier = GetMultiplierForLevel(level);
            if(multiplier > 0)
            {
                return lot / multiplier;
            }
        }
     }
     return 0;
}
    
/*======================================================================================================
                                        Closing the Grids / Trades / Drawdowns
======================================================================================================*/

void CheckAndCloseGrids(int symbolIndex){

   if(PositionsTotal() == 0) return;
   
   string symbol = SymbolsArray[symbolIndex].SymbolName;
   
   // Calculate magic number prefixes
   int magicBase = MagicNumberBase + UID;
   int digits = StringLen(IntegerToString(magicBase));
   int buyPrefix = magicBase + (int)MathPow(10.0, digits);
   int sellPrefix = magicBase + (int)MathPow(10.0, digits) * 2;
   
   for(ENUM_POSITION_TYPE posType = POSITION_TYPE_BUY; posType <= POSITION_TYPE_SELL; posType++)
   {
       for(int i = PositionsTotal() - 1; i >= 0; i--)
       {
           if(!posInfo.SelectByIndex(i))
           {
               Print(TradeComment + " " + symbol, ": Failed to select order! Error=", GetLastError());
               continue;
           }
   
           int ticket = (int)posInfo.Ticket();
           ENUM_POSITION_TYPE type = posInfo.PositionType();
           string orderSymbol = posInfo.Symbol();
           double lots = posInfo.Volume();
           int magic = (int)posInfo.Magic();
           double tp = posInfo.TakeProfit();
           double sl = posInfo.StopLoss();
           datetime openTime = (datetime)posInfo.Time();
           double openPrice = posInfo.PriceOpen();   

            // Close buy orders
                    if(posType == POSITION_TYPE_BUY && type == POSITION_TYPE_BUY && orderSymbol == symbol && magic / 100 == buyPrefix)
                    {
                        bool closed = CloseOrder(symbolIndex, ticket, POSITION_TYPE_BUY, orderSymbol, lots,
                                                 magic, tp, sl, openTime, openPrice);
                        if(closed) break;
                    }
                    // Close sell orders
                    if(posType == POSITION_TYPE_SELL && type == POSITION_TYPE_SELL && orderSymbol == symbol && magic / 100 == sellPrefix)
                    {
                        bool closed = CloseOrder(symbolIndex, ticket, POSITION_TYPE_SELL, orderSymbol, lots,
                                                 magic, tp, sl, openTime, openPrice);
                        if(closed) break;
                    }
                }
            }   
}

bool CloseOrder(int symbolIndex, int ticket, ENUM_POSITION_TYPE orderType, string symbol, double lots,
                int magic, double oldTP, double oldSL, datetime openTime, double openPrice){

    // Get market info
    double spread = (double)SymbolInfoInteger(symbol, SYMBOL_SPREAD);
    double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
    double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
    double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
    int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

    // Calculate pip multiplier based on digits
    int pipMultiplier = (digits == 5 || digits == 3) ? 10 : 1;
    int slippage = MaximumSlippage * pipMultiplier;
    double maxSpread = MaximumSpread * pipMultiplier;

    // Check bar index for OPO method
    int barIndex = iBarShift(symbol, MainTimeframe, openTime, true);
    SymbolsArray[symbolIndex].CurrentBarIndex = barIndex;
    
   // Calculate close conditions
   bool shouldClose = false;
   double closePrice = 0;
   double slPrice = 0;
   double tpPrice = 0;
    
   // Get stored TP/SL if using hidden methods
   if(HideTP || HideSL || Use_OPO_Method)
   {
       double avgPrice = openPrice;
   
       // Get average price from grid if available
       if(MaximumTrades - 1 > 0 && TradeMultiplier_3rd > 0.0 && TradeDistance > Epsilon)
       {
           int direction = (orderType == POSITION_TYPE_BUY) ? 1 : -1;
   
           if(GridExists(symbol, 0, direction))
           {
               avgPrice = NormalizeDouble(GetWeightedAvgPrice(symbol, 0, direction), digits);
           }
           else
           {
               if(orderType == POSITION_TYPE_BUY && SymbolsArray[symbolIndex].LastBuyAvgPrice > Epsilon)
                   avgPrice = SymbolsArray[symbolIndex].LastBuyAvgPrice;
               if(orderType == POSITION_TYPE_SELL && SymbolsArray[symbolIndex].LastSellAvgPrice > Epsilon)
                   avgPrice = SymbolsArray[symbolIndex].LastSellAvgPrice;
           }
       }    
       
       slPrice = CalculateStopLoss(symbolIndex, avgPrice, (orderType == POSITION_TYPE_BUY) ? 1 : -1);

       if(orderType == POSITION_TYPE_BUY && SymbolsArray[symbolIndex].LastBuyTP > Epsilon)
           tpPrice = SymbolsArray[symbolIndex].LastBuyTP;
       if(orderType == POSITION_TYPE_SELL && SymbolsArray[symbolIndex].LastSellTP > Epsilon)
           tpPrice = SymbolsArray[symbolIndex].LastSellTP;
   }
   
   // Get close price for OPO method
   double opoClose = SymbolsArray[symbolIndex].ClosePrice;
   if(OPO_TimeFrame != 15)
       opoClose = iClose(SymbolsArray[symbolIndex].SymbolName, OPO_TimeFrame, 1);
    
   // Determine if we should close
   if(orderType == POSITION_TYPE_BUY)
   {
       shouldClose =
           (barIndex > SymbolsArray[symbolIndex].LastBarIndex && SymbolsArray[symbolIndex].LastBarIndex != 0) ||
           (HideSL && bid <= slPrice) ||
           (HideTP && bid >= tpPrice && !Use_OPO_Method && !SmartTP) ||
           (Use_OPO_Method && opoClose >= tpPrice && !SmartTP &&
            !SymbolsArray[symbolIndex].GridOpened && !SymbolsArray[symbolIndex].OPOTriggered) ||
           DrawdownTriggered;
   
       closePrice = bid;
   }
   else // POSITION_TYPE_SELL
   {
       shouldClose =
           (barIndex > SymbolsArray[symbolIndex].LastBarIndex && SymbolsArray[symbolIndex].LastBarIndex != 0) ||
           (HideSL && ask >= slPrice) ||
           (HideTP && ask <= tpPrice && !Use_OPO_Method && !SmartTP) ||
           (Use_OPO_Method && (ask - bid + opoClose) <= tpPrice && !SmartTP &&
            !SymbolsArray[symbolIndex].GridOpened && !SymbolsArray[symbolIndex].OPOTriggered) ||
           DrawdownTriggered;
           
           closePrice = ask;
   }
   
   if(!shouldClose)
    return false;

   // Attempt to close
   Print(TradeComment + " " + symbol, ": Closing ", (orderType == POSITION_TYPE_BUY ? "buy" : "sell"),
         " trade: ", ticket);
         
  // Check spread before closing
   if(spread <= maxSpread || MaximumSpread <= Epsilon)
   {
       for(int j = PositionsTotal() - 1; j >= 0; j--)
       {
           if(!posInfo.SelectByIndex(j)) continue;
           if(posInfo.Symbol() != symbol) continue;
           int mag = (int)posInfo.Magic();
           if(!g_magic.IsOurOrder(mag)) continue;
           int dir = g_magic.GetDirectionFromMagic(mag);
           if(orderType == POSITION_TYPE_BUY && dir != 1) continue;
           if(orderType == POSITION_TYPE_SELL && dir != 2) continue;
   
           Trade.SetDeviationInPoints(MaximumSlippage * pipMultiplier);
           if(Trade.PositionClose((int)posInfo.Ticket()))
               Print(TradeComment + " " + symbol, ": Grid position closed as part of TP hit: ", posInfo.Ticket());
           else
               Print(TradeComment + " " + symbol, ": Failed to close position: ", posInfo.Ticket(), " Retcode: ", Trade.ResultRetcode());
       }
       return true;
   }
   else
   {
       Print(TradeComment + " " + symbol, ": Cannot close ", (orderType == POSITION_TYPE_BUY ? "buy" : "sell"),
             " trade due to high spread: ", DoubleToString(spread, 1));
       Sleep(1000);
   }
   return false;
}    
    
    

void CheckMaxDrawdown()  {

   double drawdown = 0;
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   
   // Calculate drawdown based on what we're measuring
   if(DrawdownCalculation == 1) // This strategy only
   {
       double profit = 0;
       for(int i = 0; i < PositionsTotal(); i++)
       {
           if(!posInfo.SelectByIndex(i))
           {
               Print("OrderSelect failed: ", GetLastError());
               continue;
           }
   
           int magic = (int)posInfo.Magic();
   
           if(!g_magic.IsOurOrder(magic)) continue;
   
           profit += posInfo.Profit() + posInfo.Swap() + posInfo.Commission();
       }
   
       drawdown = (profit < 0) ? -profit : 0;
   }
   else // The entire account (DrawdownCalculation == 0)
   {
       drawdown = balance - AccountInfoDouble(ACCOUNT_EQUITY);
       if(drawdown < 0) drawdown = 0;
   }
   
   // Check percentage drawdown
   if(MaximumDrawdown > Epsilon && MaximumDrawdown < 99.99)
   {
       if(drawdown > MaximumDrawdown / 100.0 * balance)
       {
           HandleDrawdownTrigger();
           return;
       }
   }
   
   // Check money drawdown
   if(MaximumDrawdownMoney > Epsilon)
   {
       if(drawdown > MaximumDrawdownMoney)
       {
           HandleDrawdownTrigger();
       }
   }
}

void HandleDrawdownTrigger(){

    static datetime lastMsg = 0;
    if(TimeCurrent() - lastMsg > 3600)
    {
        Print(TradeComment + ": Maximum drawdown triggered! Action: ", MaximumDrawdownAction);
        lastMsg = TimeCurrent();
    }

    switch(MaximumDrawdownAction)
    {
        case 0: // Close & stop trading for 24h
            DrawdownTriggered = true;
            DrawdownCooldownHours = 24;
            DisableAllTrading();
            break;

        case 1: // Close & stop trading until restart
            DrawdownTriggered = true;
            StopTradingUntilRestart = true;
            DisableAllTrading();
            break;

      case 2: // Ignore new signals only
                  DisableAllTrading();
                  break;
      
              case 3: // Ignore new signals until restart
                  StopTradingUntilRestart = true;
                  DisableAllTrading();
                  break;
          }
      }
      
void DisableAllTrading(){

    for(int i = 0; i < ArraySize(SymbolsArray); i++)
    {
        SymbolsArray[i].CanBuy = false;
        SymbolsArray[i].CanSell = false;
    }
}      

/*======================================================================================================
                                        General Helping Functions
======================================================================================================*/

bool IsTradingAllowed(){

   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION))
      return true;

   int allowed = (int)TerminalInfoInteger(TERMINAL_TRADE_ALLOWED);
   if(allowed == 0)
      return false;

   allowed = (int)AccountInfoInteger(ACCOUNT_TRADE_EXPERT);
   if(allowed == 0)
      return false;

   allowed = MQLInfoInteger(MQL_TRADE_ALLOWED);
   if(allowed == 0)
      return false;

   return true;
}


int GetPipMultiplier(string symbol) {

   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   if(digits == 5 || digits == 3)
      return 10;
   return 1;
}


double GetMarginRequired(string symbol){
    
    double margin = 0;
    int attempts = 0;
    
    while(margin < Epsilon && attempts < 3 && symbol != "??????")
    {
        attempts++;
        if(attempts == 1) Sleep(100);
        if(attempts == 2) Sleep(1000);
        if(attempts == 3) Sleep(2000);
        
        if(!OrderCalcMargin(ORDER_TYPE_BUY, symbol, 1.0, SymbolInfoDouble(symbol, SYMBOL_ASK), margin)) 
            margin=0;
        
        if(attempts == 3 && margin < Epsilon)
            Print(TradeComment + " " + symbol, ": Failed to get MODE_MARGINREQUIRED after 3 attempts");
    }
    
    return margin;
}

double GetLeverage(string symbol){
    
    double lev = (double)AccountInfoInteger(ACCOUNT_LEVERAGE);
    int attempts = 0;
    
    while(lev < Epsilon && attempts < 3 && symbol != "??????")
    {
        attempts++;
        if(attempts == 1) Sleep(100);
        if(attempts == 2) Sleep(1000);
        if(attempts == 3) Sleep(2000);
        
        lev = (double)AccountInfoInteger(ACCOUNT_LEVERAGE);
        
        if(attempts == 3 && lev < Epsilon)
            Print(TradeComment + " " + symbol, ": Failed to get ACCOUNT_LEVERAGE after 3 attempts");
    }
    
    return lev;
}

bool SplitAndOpenOrders(int symbolIndex, ENUM_ORDER_TYPE orderType, int level, double totalLotSize){

string symbol = SymbolsArray[symbolIndex].SymbolName;
    double maxLot = GetMaxLot(symbol);
    int numOrders = (int)MathCeil(totalLotSize / maxLot);
    double remainingLots = totalLotSize;
    bool allSuccess = true;

    for(int i = 0; i < numOrders; i++)
    {
        double lotSize = MathMin(maxLot, remainingLots);
        lotSize = NormalizeLotSize(symbol, lotSize);

        if(!SendGridOrder(symbolIndex, orderType, level, lotSize))
            allSuccess = false;

        remainingLots -= lotSize;
        Sleep(500);
    }

   return allSuccess;
}

double GetMaxLot(string symbol){

    double maxLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
    double limitMax = SymbolInfoDouble(symbol, SYMBOL_VOLUME_LIMIT);

    if(limitMax > 0 && limitMax < maxLot)
        maxLot = limitMax;

    return MathMin(maxLot, MaximumLot);
}
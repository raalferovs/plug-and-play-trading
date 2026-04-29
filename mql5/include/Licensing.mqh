//+------------------------------------------------------------------+
//|                                                   Licensing.mqh  |
//|         Plug & Play Trading - reusable EA license validation     |
//|                                                                  |
//|  Usage in your EA:                                               |
//|    #include "../include/Licensing.mqh"                           |
//|    input string LicenseKey      = "";                            |
//|    input string LicenseEndpoint = "";                            |
//|    int  OnInit()  { if(!LicenseInit(LicenseKey,LicenseEndpoint)) |
//|                       return INIT_FAILED; ... }                  |
//|    void OnTick()  { if(!LicenseAllowed()) return; ... }          |
//|    void OnTimer() { LicenseTick(); ... }                         |
//|                                                                  |
//|  MT5 setup (one-time, per machine):                              |
//|    Tools > Options > Expert Advisors > Allow WebRequest for      |
//|    listed URL  ->  add the production URL below.                 |
//+------------------------------------------------------------------+
#ifndef _PNP_LICENSING_MQH
#define _PNP_LICENSING_MQH

#define LIC_DEFAULT_URL    "https://plug-and-play-trading-production.up.railway.app/api/licenses/validate"
#define LIC_TIMEOUT_MS     5000
#define LIC_GRACE_HOURS    72
#define LIC_RECHECK_HOURS  24
#define LIC_LOG_PREFIX     "[LIC] "

string   g_licKey            = "";
string   g_licEndpoint       = "";
bool     g_licAllowed        = false;
datetime g_licLastOk         = 0;
bool     g_licDeniedAlerted  = false;

string LIC_AccountTypeStr()
{
   long mode = AccountInfoInteger(ACCOUNT_TRADE_MODE);
   if(mode == ACCOUNT_TRADE_MODE_REAL) return "live";
   return "demo";
}

string LIC_GVarName()
{
   long login = AccountInfoInteger(ACCOUNT_LOGIN);
   string keyShort = (StringLen(g_licKey) >= 8)
                     ? StringSubstr(g_licKey, StringLen(g_licKey) - 8, 8)
                     : g_licKey;
   return StringFormat("LIC_%s_%I64d_LASTOK", keyShort, login);
}

void LIC_LoadCache()
{
   string gname = LIC_GVarName();
   if(GlobalVariableCheck(gname))
      g_licLastOk = (datetime)(long)GlobalVariableGet(gname);
   else
      g_licLastOk = 0;
}

void LIC_SaveCache()
{
   GlobalVariableSet(LIC_GVarName(), (double)(long)g_licLastOk);
}

string LIC_ExtractField(const string &json, const string fieldName)
{
   string needle = "\"" + fieldName + "\":\"";
   int start = StringFind(json, needle);
   if(start < 0) return "";
   start += StringLen(needle);
   int end = StringFind(json, "\"", start);
   if(end < 0) return "";
   return StringSubstr(json, start, end - start);
}

bool LIC_DoValidate(string &outReason, string &outMessage)
{
   string accStr = LIC_AccountTypeStr();
   long   login  = AccountInfoInteger(ACCOUNT_LOGIN);
   string server = AccountInfoString(ACCOUNT_SERVER);

   string body = StringFormat(
      "{\"licenseKey\":\"%s\",\"mt5Account\":\"%I64d\",\"accountType\":\"%s\",\"brokerServer\":\"%s\"}",
      g_licKey, login, accStr, server
   );

   PrintFormat("%sValidating against %s", LIC_LOG_PREFIX, g_licEndpoint);

   char post[];
   int n = StringToCharArray(body, post, 0, -1, CP_UTF8);
   if(n > 0) ArrayResize(post, n - 1); // drop trailing null

   char   result[];
   string respHeaders = "";
   string reqHeaders  = "Content-Type: application/json\r\n";

   ResetLastError();
   int code = WebRequest("POST", g_licEndpoint, reqHeaders, LIC_TIMEOUT_MS,
                         post, result, respHeaders);

   if(code == -1)
   {
      int err = GetLastError();
      outReason  = "network_error";
      outMessage = StringFormat(
         "WebRequest failed (err %d). Did you allow %s in MT5 Tools > Options > Expert Advisors?",
         err, g_licEndpoint);
      PrintFormat("%s%s", LIC_LOG_PREFIX, outMessage);
      return false;
   }

   string respStr = CharArrayToString(result, 0, -1, CP_UTF8);

   if(code == 200 && StringFind(respStr, "\"ok\":true") >= 0)
      return true;

   outReason  = LIC_ExtractField(respStr, "reason");
   outMessage = LIC_ExtractField(respStr, "message");
   if(StringLen(outReason)  == 0) outReason  = StringFormat("http_%d", code);
   if(StringLen(outMessage) == 0) outMessage = "Validation failed";
   return false;
}

//+------------------------------------------------------------------+
//| Public API                                                       |
//+------------------------------------------------------------------+

bool LicenseInit(string licenseKey, string endpointOverride = "")
{
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION))
   {
      g_licAllowed = true;
      return true;
   }

   if(StringLen(licenseKey) == 0)
   {
      Alert(LIC_LOG_PREFIX, "License key is empty. Paste your key into the EA inputs.");
      Print(LIC_LOG_PREFIX, "License key is empty.");
      return false;
   }

   g_licKey       = licenseKey;
   g_licEndpoint  = (StringLen(endpointOverride) > 0) ? endpointOverride : LIC_DEFAULT_URL;
   g_licDeniedAlerted = false;

   LIC_LoadCache();

   string reason  = "";
   string message = "";
   bool   ok      = LIC_DoValidate(reason, message);

   if(ok)
   {
      g_licAllowed = true;
      g_licLastOk  = TimeCurrent();
      LIC_SaveCache();
      PrintFormat("%sOK -- next check in %d h", LIC_LOG_PREFIX, LIC_RECHECK_HOURS);
      return true;
   }

   // Server unreachable but cached grace still valid -> tolerate.
   if(g_licLastOk > 0 && (TimeCurrent() - g_licLastOk) < LIC_GRACE_HOURS * 3600)
   {
      g_licAllowed = true;
      PrintFormat("%sServer check failed (%s) -- grace period still valid, allowing.",
                  LIC_LOG_PREFIX, reason);
      return true;
   }

   PrintFormat("%sDENIED: %s -- %s", LIC_LOG_PREFIX, reason, message);
   Alert(LIC_LOG_PREFIX, "License denied: ", message);
   g_licAllowed = false;
   return false;
}

bool LicenseAllowed()
{
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION))
      return true;
   return g_licAllowed;
}

void LicenseTick()
{
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION))
      return;
   if(StringLen(g_licKey) == 0)
      return;

   datetime now = TimeCurrent();

   if(g_licLastOk > 0 && (now - g_licLastOk) < LIC_RECHECK_HOURS * 3600)
      return; // not yet time to re-check

   string reason  = "";
   string message = "";
   bool   ok      = LIC_DoValidate(reason, message);

   if(ok)
   {
      g_licAllowed = true;
      g_licLastOk  = now;
      g_licDeniedAlerted = false;
      LIC_SaveCache();
      PrintFormat("%sRefreshed OK", LIC_LOG_PREFIX);
      return;
   }

   if(g_licLastOk > 0 && (now - g_licLastOk) < LIC_GRACE_HOURS * 3600)
      return; // still in grace, keep running

   if(!g_licDeniedAlerted)
   {
      PrintFormat("%sDENIED on re-check: %s -- %s", LIC_LOG_PREFIX, reason, message);
      Alert(LIC_LOG_PREFIX, "License denied: ", message,
            " - EA will not open new trades.");
      g_licDeniedAlerted = true;
   }
   g_licAllowed = false;
}

#endif // _PNP_LICENSING_MQH

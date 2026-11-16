import React,{useCallback,useEffect,useRef,useState}from"react";
import{ActivityIndicator,BackHandler,SafeAreaView,StatusBar,StyleSheet,Text,View}from"react-native";
import{WebView,WebViewNavigation}from"react-native-webview";

const HOME="https://playovia.xyz/";

export default function App(){
 const web=useRef<WebView>(null);
 const [canGoBack,setCanGoBack]=useState(false);
 const [loading,setLoading]=useState(true);
 const [failed,setFailed]=useState(false);
 const [progress,setProgress]=useState(0);
 const back=useCallback(()=>{if(canGoBack){web.current?.goBack();return true}return false},[canGoBack]);
 useEffect(()=>{const sub=BackHandler.addEventListener("hardwareBackPress",back);return()=>sub.remove()},[back]);
 const nav=(state:WebViewNavigation)=>setCanGoBack(state.canGoBack);
 return <SafeAreaView style={styles.root}>
  <StatusBar backgroundColor="#090b16" barStyle="light-content"/>
  <WebView ref={web} source={{uri:HOME}} style={styles.web}
   javaScriptEnabled domStorageEnabled thirdPartyCookiesEnabled sharedCookiesEnabled
   allowsBackForwardNavigationGestures javaScriptCanOpenWindowsAutomatically
   setSupportMultipleWindows={false} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false}
   originWhitelist={["http://*","https://*"]} mixedContentMode="compatibility"
   onNavigationStateChange={nav}
   onLoadStart={()=>{setLoading(true);setFailed(false);setProgress(0)}}
   onLoadProgress={({nativeEvent})=>setProgress(nativeEvent.progress)}
   onLoadEnd={()=>setLoading(false)}
   onError={()=>{setLoading(false);setFailed(true)}}
   onHttpError={({nativeEvent})=>{if(nativeEvent.statusCode>=500)setFailed(true)}}
   onOpenWindow={({nativeEvent})=>{if(nativeEvent.targetUrl)web.current?.injectJavaScript("window.location.href="+JSON.stringify(nativeEvent.targetUrl)+";true;")}}
   renderLoading={()=><View style={styles.loading}><Text style={styles.logo}>PLAY<Text style={styles.accent}>OVIA</Text></Text><ActivityIndicator size="large" color="#a78bfa"/><Text style={styles.label}>Loading Playovia…</Text></View>}
   startInLoadingState
  />
  {loading&&<View pointerEvents="none" style={styles.progress}><View style={[styles.progressFill,{width:(Math.max(0,Math.min(1,progress))*100)+"%"}]}/></View>}
  {failed&&!loading&&<View style={styles.error}><Text style={styles.errorTitle}>Connection problem</Text><Text style={styles.label}>Playovia could not be loaded. Check your internet and reload.</Text></View>}
 </SafeAreaView>
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:"#090b16"},web:{flex:1,backgroundColor:"#090b16"},loading:{...StyleSheet.absoluteFillObject,backgroundColor:"#090b16",alignItems:"center",justifyContent:"center",gap:18},logo:{fontSize:30,fontWeight:"900",letterSpacing:2,color:"#fff"},accent:{color:"#a78bfa"},label:{color:"#aaa9c0",fontSize:13,textAlign:"center"},progress:{height:2,backgroundColor:"#201b35"},progressFill:{height:2,backgroundColor:"#a78bfa"},error:{position:"absolute",bottom:24,left:20,right:20,padding:16,borderRadius:14,backgroundColor:"#21172a",borderWidth:1,borderColor:"#63436e"},errorTitle:{color:"#fff",fontSize:16,fontWeight:"800",marginBottom:5}});

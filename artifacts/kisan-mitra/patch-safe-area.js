const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  'node_modules/react-native-safe-area-context/android/src/main/java/com/th3rdwave/safeareacontext/SafeAreaProviderManager.kt'
);

if (!fs.existsSync(filePath)) {
  console.log('[patch-safe-area] file not found — skipping');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');
let changed = false;

if (!content.includes('import com.facebook.react.uimanager.ViewManagerDelegate')) {
  content = content.replace(
    'import com.facebook.react.uimanager.ViewGroupManager',
    'import com.facebook.react.uimanager.ViewGroupManager\nimport com.facebook.react.uimanager.ViewManagerDelegate'
  );
  changed = true;
}

if (content.includes('private val mDelegate = RNCSafeAreaProviderManagerDelegate(this)')) {
  content = content.replace(
    'private val mDelegate = RNCSafeAreaProviderManagerDelegate(this)',
    'private val mDelegate = RNCSafeAreaProviderManagerDelegate<SafeAreaProvider, SafeAreaProviderManager>(this)'
  );
  changed = true;
}

if (content.includes('override fun getDelegate() = mDelegate')) {
  content = content.replace(
    'override fun getDelegate() = mDelegate',
    'override fun getDelegate(): ViewManagerDelegate<SafeAreaProvider>? = mDelegate'
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[patch-safe-area] SafeAreaProviderManager.kt patched for RN 0.79 compatibility ✓');
} else {
  console.log('[patch-safe-area] no changes needed');
}

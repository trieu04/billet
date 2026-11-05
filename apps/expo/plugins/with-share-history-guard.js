const { withMainActivity } = require('expo/config-plugins')

const ON_CREATE = 'override fun onCreate(savedInstanceState: Bundle?) {'
const IMPORT = 'import android.content.Intent'
const GUARD = `
    // A share intent is delivered once. Android repeats it when the activity is recreated or
    // reopened from Recents, which would bring back an image the user already handled.
    if (intent.type != null && (savedInstanceState != null || (intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0)) {
      intent = Intent(Intent.ACTION_MAIN)
    }`

module.exports = function withShareHistoryGuard(config) {
  return withMainActivity(config, (mod) => {
    let contents = mod.modResults.contents
    if (contents.includes('FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY')) return mod
    if (!contents.includes(ON_CREATE)) throw new Error('MainActivity.onCreate was not found')
    if (!contents.includes(IMPORT)) {
      contents = contents.replace('import android.os.Bundle', `${IMPORT}\nimport android.os.Bundle`)
    }
    mod.modResults.contents = contents.replace(ON_CREATE, `${ON_CREATE}${GUARD}`)
    return mod
  })
}

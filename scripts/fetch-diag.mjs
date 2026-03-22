
const supabaseUrl = 'https://oeasoozbjhejbgfaiasa.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lYXNvb3piamhlamJnZmFpYXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDc2NjAsImV4cCI6MjA4ODgyMzY2MH0.Jg0aunwXFegfuMSkcKIkJo4_HtbEyEkf7sPvoL94k2A'

async function diagnostic() {
  console.log('--- DIAGNOSTIC START ---')
  console.log('Testing Password Login to Supabase directly...')
  
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'eneas_gandolfi@hotmail.com',
        password: 'wrongpassword'
      })
    })
    
    console.log('Status:', res.status)
    const text = await res.text()
    console.log('Response (first 100 chars):', text.substring(0, 100))
    
    if (text.trim().startsWith('<')) {
      console.log('DETECTED HTML RESPONSE!')
    } else {
      console.log('DETECTED JSON RESPONSE!')
    }
  } catch (err) {
    console.error('Fetch failed:', err)
  }
}

diagnostic()

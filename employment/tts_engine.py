import sys
import json
import asyncio
import re
import edge_tts

# Voice mapping:
# Amharic: am-ET-AmehaNeural (Male Ethiopian studio voice - calibrated to Kirubel Ahadu's articulate, warm, fluent tone and cadence)
# Tigrinya: am-ET-AmehaNeural (Ge'ez phonology with natural Horn of Africa cadence)
# Afaan Oromoo: so-SO-MuuseNeural (East African Cushitic phonology with phonemic vowel length)
# English: en-US-JennyNeural (Warm, clear studio narration)
VOICE_MAP = {
    'am': 'am-ET-AmehaNeural',
    'ti': 'am-ET-AmehaNeural',
    'om': 'so-SO-MuuseNeural',
    'en': 'en-US-JennyNeural'
}

def clean_and_phoneticize(text, lang):
    """
    Transliterates English loanwords into target language phonetics
    so the neural synthesis engine produces authentic native pronunciations.
    """
    if not text:
        return text

    if lang == 'am':
        # Transliterate technical loanwords into Ge'ez to avoid English accent clashes
        subs = [
            (r'\bDashboard\b', 'ዳሽቦርድ'),
            (r'\bModule\b', 'ሞጁል'),
            (r'\bVideo\b', 'ቪዲዮ'),
            (r'\bPlay\b', 'አጫውት'),
            (r'\bPause\b', 'አቁም'),
            (r'\bALX\b', 'ኤ ኤል ኤክስ'),
            (r'\bPortfolio\b', 'ፖርትፎሊዮ'),
            (r'\bCapstone\b', 'ካፕስቶን'),
            (r'\bSign in\b', 'ግባ'),
            (r'\bSign out\b', 'ውጣ'),
            (r'\bLogin\b', 'መግቢያ'),
            (r'\bProjects?\b', 'ፕሮጀክቶች'),
            (r'\bQuizz?es?\b', 'ፈተናዎች'),
            (r'\bPlanning\b', 'እቅድ'),
            (r'\bCourses?\b', 'ኮርሶች'),
            (r'\bConcepts?\b', 'ፅንሰ ሀሳቦች'),
            (r'\bProfile\b', 'መገለጫ'),
            (r'\bCalendar\b', 'የቀን መቁጠሪያ'),
            (r'\bWorkshop\b', 'ወርክሾፕ'),
            (r'\bVOD\b', 'ቪዲዮ'),
            (r'\bGoogle\b', 'ጉግል'),
            (r'\bGitHub\b', 'ጊትሀብ')
        ]
        for pattern, replacement in subs:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    elif lang == 'om':
        # Ensure smooth Qubee loanwords
        subs = [
            (r'\bDashboard\b', 'Daashboordii'),
            (r'\bModule\b', 'Moojulii'),
            (r'\bVideo\b', 'Viidiyoo'),
            (r'\bALX\b', 'Eel Eeks'),
            (r'\bPortfolio\b', 'Poortfooliyoo'),
            (r'\bCapstone\b', 'Kaapistooni'),
            (r'\bSign in\b', 'Seeni'),
            (r'\bSign out\b', 'Ba\'i'),
            (r'\bLogin\b', 'Seensa'),
            (r'\bProjects?\b', 'Pirojektiiwwan'),
            (r'\bQuizz?es?\b', 'Qormaata'),
            (r'\bPlanning\b', 'Karoora'),
            (r'\bCourses?\b', 'Koorsiiwwan'),
            (r'\bConcepts?\b', 'Yaad-hiddama')
        ]
        for pattern, replacement in subs:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    elif lang == 'ti':
        # Transliterate technical loanwords into Ge'ez for Tigrinya
        subs = [
            (r'\bDashboard\b', 'ዳሽቦርድ'),
            (r'\bModule\b', 'ሞጁል'),
            (r'\bVideo\b', 'ቪዲዮ'),
            (r'\bALX\b', 'ኤ ኤል ኤክስ'),
            (r'\bPortfolio\b', 'ፖርትፎሊዮ'),
            (r'\bCapstone\b', 'ካፕስቶን'),
            (r'\bSign in\b', 'እቶ'),
            (r'\bSign out\b', 'ውጻእ'),
            (r'\bLogin\b', 'መእተዊ'),
            (r'\bProjects?\b', 'ፕሮጀክትታት'),
            (r'\bQuizz?es?\b', 'ፈተናታት'),
            (r'\bPlanning\b', 'መደብ'),
            (r'\bCourses?\b', 'ኮርሳት'),
            (r'\bConcepts?\b', 'ፅንሰ ሓሳባት')
        ]
        for pattern, replacement in subs:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    return text

async def generate(text, lang, output_path, voice=None):
    clean_text = clean_and_phoneticize(text, lang)
    selected_voice = voice or VOICE_MAP.get(lang, 'am-ET-AmehaNeural' if lang in ['am', 'ti'] else 'en-US-JennyNeural')
    rate = '+0%'
    pitch = '+0Hz'
    
    if lang == 'am':
        # Calibrated to Kirubel Ahadu's cadence: warm baritone, measured Addis Ababa delivery
        rate = '-2%'
        pitch = '-1Hz'
    elif lang == 'ti':
        rate = '-2%'
        pitch = '-1Hz'
    elif lang == 'om':
        # Cushitic phonology pacing
        rate = '-3%'
        pitch = '+0Hz'
    elif lang == 'en':
        rate = '+0%'
        pitch = '+0Hz'

    comm = edge_tts.Communicate(clean_text, selected_voice, rate=rate, pitch=pitch)
    await comm.save(output_path)
    print("SUCCESS")

if __name__ == '__main__':
    # Mode 1: Read JSON from stdin (bypasses Windows CLI codepage limitation for UTF-8 Ge'ez/Amharic)
    if len(sys.argv) == 1 or sys.argv[1] == '--stdin':
        try:
            raw_input = sys.stdin.buffer.read().decode('utf-8')
            payload = json.loads(raw_input)
            text_arg = payload['text']
            lang_arg = payload.get('lang', 'am')
            out_arg = payload['outputPath']
            voice_arg = payload.get('voice')
            asyncio.run(generate(text_arg, lang_arg, out_arg, voice_arg))
        except Exception as e:
            sys.stderr.write(f"Error: {e}\n")
            sys.exit(1)
    else:
        # Mode 2: Command line arguments fallback
        text_arg = sys.argv[1]
        lang_arg = sys.argv[2]
        out_arg = sys.argv[3]
        voice_arg = sys.argv[4] if len(sys.argv) > 4 else None
        try:
            asyncio.run(generate(text_arg, lang_arg, out_arg, voice_arg))
        except Exception as e:
            sys.stderr.write(f"Error: {e}\n")
            sys.exit(1)

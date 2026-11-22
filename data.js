// ===== 鍵盤配置與手指對應 =====
// 手指編號：0 左小指 1 左無名指 2 左中指 3 左食指 4 左拇指 | 5 右拇指 6 右食指 7 右中指 8 右無名指 9 右小指
const FINGER_NAMES = ['左手小指', '左手無名指', '左手中指', '左手食指', '左手拇指',
                      '右手拇指', '右手食指', '右手中指', '右手無名指', '右手小指'];

const K = (b, s, f, code, extra = {}) => ({ b, s, f, code, ...extra });
const L = (c, f, extra = {}) => K(c, c.toUpperCase(), f, 'Key' + c.toUpperCase(), extra);
const SP = (code, label, w, f) => ({ code, label, w, f });

const KEY_ROWS = [
  [K('`', '~', 0, 'Backquote'), K('1', '!', 0, 'Digit1'), K('2', '@', 1, 'Digit2'), K('3', '#', 2, 'Digit3'),
   K('4', '$', 3, 'Digit4'), K('5', '%', 3, 'Digit5'), K('6', '^', 6, 'Digit6'), K('7', '&', 6, 'Digit7'),
   K('8', '*', 7, 'Digit8'), K('9', '(', 8, 'Digit9'), K('0', ')', 9, 'Digit0'), K('-', '_', 9, 'Minus'),
   K('=', '+', 9, 'Equal'), SP('Backspace', '⌫ Back', 2, 9)],
  [SP('Tab', 'Tab', 1.5, 0), L('q', 0), L('w', 1), L('e', 2), L('r', 3), L('t', 3), L('y', 6), L('u', 6),
   L('i', 7), L('o', 8), L('p', 9), K('[', '{', 9, 'BracketLeft'), K(']', '}', 9, 'BracketRight'),
   K('\\', '|', 9, 'Backslash', { w: 1.5 })],
  [SP('CapsLock', 'Caps', 1.75, 0), L('a', 0), L('s', 1), L('d', 2), L('f', 3, { bump: true }), L('g', 3),
   L('h', 6), L('j', 6, { bump: true }), L('k', 7), L('l', 8), K(';', ':', 9, 'Semicolon'),
   K("'", '"', 9, 'Quote'), SP('Enter', 'Enter ↵', 2.25, 9)],
  [SP('ShiftLeft', '⇧ Shift', 2.25, 0), L('z', 0), L('x', 1), L('c', 2), L('v', 3), L('b', 3), L('n', 6),
   L('m', 6), K(',', '<', 7, 'Comma'), K('.', '>', 8, 'Period'), K('/', '?', 9, 'Slash'),
   SP('ShiftRight', 'Shift ⇧', 2.75, 9)],
  [SP('Space', 'Space', 6.25, 5)],
];

// ===== 第一階段：基礎指法課程 =====
const LESSONS = [
  { id: 'home', title: '基準列 ASDF JKL;', keys: 'asdfjkl;',
    desc: '左手 A S D F、右手 J K L ;，食指摸到 F、J 鍵上的凸點。這是所有指法的「家」。' },
  { id: 'home2', title: '基準列延伸 G H \'', keys: "gh'", mix: 'asdfjkl;',
    desc: '左食指往右移按 G、右食指往左移按 H，右小指往右按 \'，按完立刻回到 F、J。' },
  { id: 'top-l', title: '上排左手 QWERT', keys: 'qwert', mix: 'asdfg',
    desc: '左手各指從基準列「往上」伸一格，食指負責 R 和 T。' },
  { id: 'top-r', title: '上排右手 YUIOP', keys: 'yuiop', mix: 'hjkl;',
    desc: '右手各指往上伸一格，食指負責 Y 和 U。' },
  { id: 'bottom-l', title: '下排左手 ZXCVB', keys: 'zxcvb', mix: 'asdfg',
    desc: '左手各指往下彎一格，手腕保持不動，食指負責 V 和 B。' },
  { id: 'bottom-r', title: '下排右手 NM , . /', keys: 'nm,./', mix: 'hjkl;',
    desc: '右食指負責 N、M；中指按逗號、無名指按句點、小指按斜線。' },
  { id: 'brackets', title: '右上符號 [ ] \\', keys: '[]\\', mix: 'p;\'',
    desc: '這三個鍵都由右手小指負責，向右上方延伸。' },
  { id: 'num-l', title: '數字列左半 ` 1 2 3 4 5', keys: '`12345', mix: 'qwert',
    desc: '從上排再往上一格。左食指負責 4 和 5，小指負責 ` 和 1。' },
  { id: 'num-r', title: '數字列右半 6 7 8 9 0 - =', keys: '67890-=', mix: 'yuiop',
    desc: '右食指負責 6 和 7，右小指負責 0、- 和 =。' },
  { id: 'caps', title: '大寫字母（Shift）', keys: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', mix: 'asdfjkl',
    desc: '重點：用「另一隻手」的小指按住 Shift。左手的字母按右 Shift，右手的字母按左 Shift。' },
  { id: 'sym-num', title: '數字列符號 ! @ # $ % ^ & * ( )', keys: '~!@#$%^&*()_+',
    desc: '按住對側 Shift，再用原本按數字的手指按下去。' },
  { id: 'sym-other', title: '其他符號 { } | : " < > ?', keys: '{}|:"<>?',
    desc: '這些符號大多由右手負責，所以要用左手小指按住左 Shift。' },
  { id: 'all-letters', title: '綜合：全部字母', keys: 'abcdefghijklmnopqrstuvwxyz',
    desc: '隨機混合所有小寫字母，檢驗指法是否穩定。' },
  { id: 'all', title: '總複習：全部按鍵', keys: 'abcdefghijklmnopqrstuvwxyz0123456789`-=[]\\;\',./ABCDEFGHIJKLMNOPQRSTUVWXYZ~!@#$%^&*()_+{}|:"<>?',
    desc: '所有字母、數字、符號隨機出現，會自動多出你常打錯的鍵。' },
];

const POSTURE_TIPS = [
  '坐直、雙腳平放地面，螢幕上緣約與視線同高。',
  '手肘自然彎曲約 90°，手腕懸空放鬆，不要壓在桌上。',
  '左食指放 <kbd>F</kbd>、右食指放 <kbd>J</kbd>（摸凸點），其餘手指依序放在 A S D／K L ;。',
  '兩手拇指輕放在空白鍵上。',
  '每按完一個鍵，手指立刻回到基準列。',
  '眼睛看螢幕、不看鍵盤；先求準確，再求速度。',
];

// ===== 第二階段：單字 =====
const WORDS = (`
a an as at be by do go he if in is it me my no of on or so to up us we
all and any are ask bad big box boy but can car cat cut day did dog eat end eye far few fix fly for fun get got
had has her him his hot how job joy key kid let lot low man may new not now odd off old one our out own pay put
red run sad saw say sea see set she sit six sky son sun ten the too top try two use war was way who why win yes yet you zoo
able also area away baby back ball bank base bear best bird blue body book both call came card care city cold come cook
cool copy dark data deep door down draw drop each easy edge even ever face fact fall farm fast fear feel fire fish five
food foot form four free from full game gave girl give glad goal gold good gray grow half hand hard have head hear help
here high hold home hope hour idea into jump just keep kind king know lake land last late left life like line list live
long look lose love make many mind miss more most move much must name near need next nice note once only open over page
park part pass past path pick plan play push quiz rain read real rest rich ride road rock room rule safe same save seat
seem ship shop show side sign sing size slow snow soft some song soon star stay step stop such sure take talk team tell
than that them then they this time tree true turn type unit very wait walk wall want warm wash wave week well what when
wide wife wild will wind wish with word work year your zero zone
about above after again agree alone among apple begin black board brain bread bring brown build carry catch cause chair
check child clean clear clock close cloud count cover cream dance dream drink drive early earth empty enjoy enter equal
every exact extra field fight final first floor focus force fresh front fruit funny glass grass great green group guess
happy heart heavy horse house human image juice judge knife known laugh learn level light limit local lucky lunch magic
major march match maybe metal money month mouse mouth music never night noise north ocean offer order other paper party
peace phone piano piece place plant point power price proud quick quiet quite radio raise reach ready right river round
scale score sense seven shape share sharp sheep shirt short skill sleep small smile solve sound south space speak speed
spend sport stand start state still stone store storm story study style sugar sweet table teach thank their there thing
think three throw today topic total touch tower train trust truth under until upper usual value video visit voice watch
water wheel where which white whole woman world write wrong young
action animal answer august autumn banana basket beauty before better bottle bridge bright butter camera castle center
chance change choose circle coffee corner course create danger decide degree design dinner doctor dollar double effort
energy engine enough escape family famous father finger flower follow forest friend future garden gentle global ground
happen health honest hungry island jacket jungle kitten launch letter listen little market member memory method middle
minute mirror modern moment monkey mother motion myself nature number object office orange people pencil person planet
please pocket police potato pretty prince puzzle rabbit reason record repeat result return rhythm safety school screen
search season second secret select shadow silver simple single sister smooth spirit spring square street strong summer
supply system talent target thirty ticket travel turtle unique valley wallet window winter wonder yellow
ability absolute accident activity actually adventure alphabet although analysis anything approach argument attention
backward balance birthday building business calendar campaign champion chemical children chocolate climbing computer
consider continue creative customer daughter describe designer different direction discover distance document elephant
emphasis employee entrance envelope everyone evidence exercise exchange familiar favorite festival football frequent
function generate gorgeous grateful hardware historic hospital identity imagine increase industry instance internet
keyboard knowledge language learning location magazine maintain material medicine mountain movement national neighbor
notebook November numerous obstacle official operation opposite ordinary original painting paradise passenger patience
peaceful personal physical pleasure positive possible practice pressure princess probably progress property question
quantity question railway reaction recently remember research resource response sandwich schedule scissors sentence
separate shoulder software solution standard strategy strength students surprise sweater teaching thousand together
tomorrow treasure triangle umbrella universe vacation valuable vegetable whatever wonderful yesterday
`).trim().split(/\s+/).filter((w, i, arr) => arr.indexOf(w) === i);

// ===== 第三階段：長句 =====
const SENTENCES = [
  'The quick brown fox jumps over the lazy dog.',
  'Pack my box with five dozen liquor jugs.',
  'How vexingly quick daft zebras jump!',
  'Sphinx of black quartz, judge my vow.',
  'The five boxing wizards jump quickly.',
  'Practice makes perfect, so keep typing a little every day.',
  'Success is not final, failure is not fatal: it is the courage to continue that counts.',
  'The only way to do great work is to love what you do.',
  'In the middle of difficulty lies opportunity.',
  "Life is what happens when you're busy making other plans.",
  'It does not matter how slowly you go as long as you do not stop.',
  'Learning never exhausts the mind.',
  'The best time to plant a tree was 20 years ago. The second best time is now.',
  'Simplicity is the ultimate sophistication.',
  "Whether you think you can or you think you can't, you're right.",
  'Do not wait to strike till the iron is hot; make it hot by striking.',
  'An investment in knowledge pays the best interest.',
  'Typing quickly and accurately is a valuable skill in the modern world.',
  'Keep your fingers on the home row and let your eyes stay on the screen.',
  'She sells seashells by the seashore, and the shells she sells are surely seashells.',
  'On March 3rd, 2024, about 150 people attended the conference in room #42.',
  'Please send the report to info@example.com before 5:30 p.m. on Friday.',
  'The total cost was $1,299.99 (including tax), which was 15% less than expected.',
  'Is it better to be feared or loved? Machiavelli believed fear was safer.',
  'Technology is best when it brings people together.',
  'The early bird catches the worm, but the second mouse gets the cheese.',
  'Use the formula: area = width * height / 2 to find the area of a triangle.',
  'Reading is to the mind what exercise is to the body.',
  'A journey of a thousand miles begins with a single step.',
  'Imagination is more important than knowledge, for knowledge is limited.',
  'Every expert was once a beginner; never be afraid to start small.',
  'Coding is like writing: clarity matters more than cleverness.',
  "Don't count the days; make the days count.",
  'If you want to go fast, go alone; if you want to go far, go together.',
  'The museum opens at 9:00 a.m. and closes at 6:00 p.m., Monday to Saturday.',
  'Our team scored 3 goals in the first half & 2 more after the break!',
  'He asked, "Have you ever seen a sky so full of stars?"',
  'Small daily improvements are the key to staggering long-term results.',
  'Write the password on paper? No way! Use a password manager instead.',
  'Knowledge is power, but enthusiasm pulls the switch.',
];

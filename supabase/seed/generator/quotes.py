# Curated quotes: only well-documented quotes with their real authors,
# classic Arabic proverbs, and pre-1929 Arabic poetry/prose.
# "attr" marks sayings that are popularly attributed but not firmly sourced;
# their author line is prefixed with "يُنسب إلى" / "Attributed to".

Q = []

def add(ar, en, a_ar, a_en, attr=False):
    if attr:
        a_ar = "يُنسب إلى " + a_ar
        a_en = "Attributed to " + a_en
    Q.append({"quote": {"ar": ar, "en": en}, "author": {"ar": a_ar, "en": a_en}})

# --- Architecture & building ---
add("نحن نشكّل مبانينا، ثم تعود مبانينا لتشكّلنا.", "We shape our buildings; thereafter they shape us.", "ونستون تشرشل", "Winston Churchill")
add("الأقل هو الأكثر.", "Less is more.", "ميس فان دير روه", "Ludwig Mies van der Rohe")
add("الله في التفاصيل.", "God is in the details.", "ميس فان دير روه", "Ludwig Mies van der Rohe", attr=True)
add("تبدأ العمارة حين تضع طوبتين معًا بعناية. هناك تبدأ.", "Architecture starts when you carefully put two bricks together. There it begins.", "ميس فان دير روه", "Ludwig Mies van der Rohe")
add("العمارة هي إرادة العصر مترجمةً إلى فراغ.", "Architecture is the will of an epoch translated into space.", "ميس فان دير روه", "Ludwig Mies van der Rohe")
add("الشكل يتبع الوظيفة.", "Form follows function.", "لويس سوليفان", "Louis Sullivan")
add("البيت آلة للسكن.", "A house is a machine for living in.", "لو كوربوزييه", "Le Corbusier")
add("المكان والضوء والنظام؛ هذه أشياء يحتاجها الإنسان بقدر حاجته إلى الخبز ومكان للنوم.", "Space and light and order. Those are the things that men need just as much as they need bread or a place to sleep.", "لو كوربوزييه", "Le Corbusier")
add("العمارة هي اللعب المتقن الصحيح البديع بالكتل المجتمعة تحت الضوء.", "Architecture is the masterly, correct and magnificent play of masses brought together in light.", "لو كوربوزييه", "Le Corbusier")
add("العمارة هي الصناعة المتأنية للفراغ.", "Architecture is the thoughtful making of space.", "لويس كان", "Louis Kahn")
add("لم تكن الشمس تعرف مدى عظمتها حتى سقطت على جدار مبنى.", "The sun never knew how great it was until it hit the side of a building.", "لويس كان", "Louis Kahn")
add("حتى الطوبة تريد أن تكون شيئًا.", "Even a brick wants to be something.", "لويس كان", "Louis Kahn")
add("ادرس الطبيعة، أحبّ الطبيعة، ابقَ قريبًا منها؛ فلن تخذلك أبدًا.", "Study nature, love nature, stay close to nature. It will never fail you.", "فرانك لويد رايت", "Frank Lloyd Wright")
add("الطبيب يستطيع أن يدفن أخطاءه، أما المعماري فلا يملك إلا أن ينصح عملاءه بزراعة اللبلاب.", "A doctor can bury his mistakes but an architect can only advise his clients to plant vines.", "فرانك لويد رايت", "Frank Lloyd Wright")
add("ينبغي أن تتحدث العمارة عن زمانها ومكانها، وأن تتوق إلى الخلود.", "Architecture should speak of its time and place, but yearn for timelessness.", "فرانك جيري", "Frank Gehry")
add("هناك 360 درجة، فلماذا نلتزم بواحدة؟", "There are 360 degrees, so why stick to one?", "زها حديد", "Zaha Hadid")
add("العمارة في جوهرها تتعلق بالرفاهية؛ الناس يريدون أن يشعروا بالراحة في المكان.", "Architecture is really about well-being. I think that people want to feel good in a space.", "زها حديد", "Zaha Hadid")
add("العمارة فن بصري، والمباني تتحدث عن نفسها.", "Architecture is a visual art, and the buildings speak for themselves.", "جوليا مورغان", "Julia Morgan")
add("كل موقف جديد يتطلب عمارة جديدة.", "Each new situation requires a new architecture.", "جان نوفيل", "Jean Nouvel")
add("كل العمارة مأوى، والعمارة العظيمة هي تصميم فراغ يحتضن من فيه أو يرفعه أو يحفّزه.", "All architecture is shelter, all great architecture is the design of space that contains, cuddles, exalts, or stimulates the persons in that space.", "فيليب جونسون", "Philip Johnson")
add("حين نبني، فلنفكّر أننا نبني للأبد.", "When we build, let us think that we build forever.", "جون راسكن", "John Ruskin")
add("الجودة ليست مصادفة أبدًا؛ إنها دائمًا نتيجة جهد ذكي.", "Quality is never an accident; it is always the result of intelligent effort.", "جون راسكن", "John Ruskin")
add("للبناء الجيد ثلاثة شروط: المتانة، والمنفعة، والبهجة.", "Well building hath three conditions: firmness, commodity, and delight.", "هنري ووتون", "Henry Wotton")
add("الضوء أكبر بنات الخالق، وهو من أبرز جماليات المبنى.", "Light, God's eldest daughter, is a principal beauty in a building.", "توماس فولر", "Thomas Fuller")
add("العمارة موسيقى متجمدة.", "Architecture is frozen music.", "غوته", "Johann Wolfgang von Goethe", attr=True)
add("المباني الجيدة تأتي من أناس جيدين، وكل المشكلات يحلّها التصميم الجيد.", "Good buildings come from good people, and all problems are solved by good design.", "ستيفن غاردنر", "Stephen Gardiner")

# --- Design & interiors ---
add("التصميم الجيد هو أقل قدر ممكن من التصميم.", "Good design is as little design as possible.", "ديتر رامز", "Dieter Rams")
add("التفاصيل ليست مجرد تفاصيل؛ إنها التي تصنع التصميم.", "The details are not the details. They make the design.", "تشارلز إيمز", "Charles Eames")
add("إدراك الحاجة هو الشرط الأول للتصميم.", "Recognizing the need is the primary condition for design.", "تشارلز إيمز", "Charles Eames")
add("لا تضع في بيتك شيئًا لا تعرف أنه نافع أو لا تؤمن بأنه جميل.", "Have nothing in your houses that you do not know to be useful, or believe to be beautiful.", "ويليام موريس", "William Morris")
add("التصميم ليس كيف يبدو الشيء فقط؛ التصميم هو كيف يعمل.", "Design is not just what it looks like and feels like. Design is how it works.", "ستيف جوبز", "Steve Jobs")
add("الأساليب تأتي وتذهب؛ أما التصميم الجيد فلغة وليس أسلوبًا.", "Styles come and go. Good design is a language, not a style.", "ماسيمو فينيلّي", "Massimo Vignelli")
add("البساطة هي قمة التطور.", "Simplicity is the ultimate sophistication.", "ليوناردو دافنشي", "Leonardo da Vinci", attr=True)
add("الناس يتجاهلون التصميم الذي يتجاهلهم.", "People ignore design that ignores people.", "فرانك شيميرو", "Frank Chimero")
add("التصميم الجيد تجارة جيدة.", "Good design is good business.", "توماس واتسون الابن", "Thomas J. Watson Jr.")
add("التصميم هو التفكير وقد صار مرئيًا.", "Design is thinking made visual.", "سول باس", "Saul Bass")
add("أفضل الغرف هي التي تقول شيئًا عن الناس الذين يعيشون فيها.", "The best rooms have something to say about the people who live in them.", "ديفيد هيكس", "David Hicks")
add("جوهر التصميم الداخلي سيظل دائمًا الناس وطريقة عيشهم.", "The essence of interior design will always be about people and how they live.", "ألبرت هادلي", "Albert Hadley")
add("ينبغي أن يحكي بيتك قصة من أنت، وأن يكون مجموعة مما تحب.", "Your home should tell the story of who you are, and be a collection of what you love.", "نيت بيركوس", "Nate Berkus")
add("الأناقة هي الرفض.", "Elegance is refusal.", "كوكو شانيل", "Coco Chanel")
add("الموضة تبهت، ويبقى الأسلوب وحده.", "Fashion fades, only style remains the same.", "كوكو شانيل", "Coco Chanel")
add("اللون قوة تؤثر في الروح مباشرة.", "Color is a power which directly influences the soul.", "فاسيلي كاندينسكي", "Wassily Kandinsky")
add("اللون هو هوسي طوال اليوم، وبهجتي وعذابي.", "Colour is my day-long obsession, joy and torment.", "كلود مونيه", "Claude Monet")

# --- Home ---
add("لا مكان مثل البيت، مهما كان متواضعًا.", "Be it ever so humble, there's no place like home.", "جون هوارد باين", "John Howard Payne")
add("الحنين إلى البيت يسكن فينا جميعًا.", "The ache for home lives in all of us.", "مايا أنجيلو", "Maya Angelou")
add("«البيت» أجمل كلمة على الإطلاق.", "Home is the nicest word there is.", "لورا إنغالز وايلدر", "Laura Ingalls Wilder")
add("حيث نحب يكون البيت؛ بيت قد تغادره أقدامنا، لكن لا تغادره قلوبنا.", "Where we love is home — home that our feet may leave, but not our hearts.", "أوليفر ويندل هولمز", "Oliver Wendell Holmes Sr.")
add("بيتك هو جسدك الأكبر؛ ينمو في الشمس وينام في سكون الليل.", "Your house is your larger body. It grows in the sun and sleeps in the stillness of the night.", "جبران خليل جبران — النبي", "Kahlil Gibran — The Prophet")
add("ابنِ من خيالك عريشًا في البرية قبل أن تبني بيتًا داخل أسوار المدينة.", "Build of your imaginings a bower in the wilderness ere you build a house within the city walls.", "جبران خليل جبران — النبي", "Kahlil Gibran — The Prophet")
add("البيت حيث يكون القلب.", "Home is where the heart is.", "بلينيوس الأكبر", "Pliny the Elder", attr=True)

# --- Real estate & investment ---
add("أصحاب الأراضي يزدادون ثراءً وهم نائمون.", "Landlords grow rich in their sleep.", "جون ستيوارت مل", "John Stuart Mill")
add("أفضل استثمار على الأرض هو الأرض.", "The best investment on earth is earth.", "لويس غليكمان", "Louis Glickman")
add("اشترِ أرضًا؛ فهم لم يعودوا يصنعون المزيد منها.", "Buy land, they're not making it anymore.", "مارك توين", "Mark Twain", attr=True)
add("لا تنتظر لتشتري عقارًا؛ اشترِ عقارًا وانتظر.", "Don't wait to buy real estate. Buy real estate and wait.", "ويل روجرز", "Will Rogers", attr=True)

# --- Arabic heritage: proverbs, wisdom, classical poetry ---
P_AR, P_EN = "مثل عربي", "Arabic proverb"
E_AR, E_EN = "مثل مصري", "Egyptian proverb"
add("الجار قبل الدار.", "Choose the neighbour before the house.", P_AR, P_EN)
add("اختر الجار قبل الدار، والرفيق قبل الطريق.", "Choose the neighbour before the house, and the companion before the road.", P_AR, P_EN)
add("على قدّ لحافك مدّ رجليك.", "Stretch your legs only as far as your quilt reaches.", E_AR, E_EN)
add("القرش الأبيض ينفع في اليوم الأسود.", "The white piaster helps on the black day.", E_AR, E_EN)
add("اسأل مجرّب ولا تسأل حكيم.", "Ask the experienced rather than the wise.", P_AR, P_EN)
add("ما خاب من استشار.", "Whoever seeks counsel is never disappointed.", P_AR, P_EN)
add("في التأني السلامة، وفي العجلة الندامة.", "In patience lies safety, and in haste lies regret.", P_AR, P_EN)
add("خير الأمور أوسطها.", "The best of matters is the middle way.", P_AR, P_EN)
add("من جدّ وجد، ومن زرع حصد.", "Who strives finds, and who sows reaps.", P_AR, P_EN)
add("الصبر مفتاح الفرج.", "Patience is the key to relief.", P_AR, P_EN)
add("ليس كل ما يلمع ذهبًا.", "Not all that glitters is gold.", P_AR, P_EN)
add("لكل مقام مقال.", "Every occasion has its fitting words.", P_AR, P_EN)
add("الوقت كالسيف، إن لم تقطعه قطعك.", "Time is like a sword: if you do not cut it, it cuts you.", P_AR, P_EN)
add("ربّ ضارّة نافعة.", "Many a harm turns out to be a benefit.", P_AR, P_EN)
add("العلم في الصغر كالنقش على الحجر.", "Learning in youth is like carving in stone.", P_AR, P_EN)
add("اللي بنى مصر كان في الأصل حلواني.", "The one who built Egypt was originally a confectioner.", E_AR, E_EN)
add("قيمة كل امرئ ما يُحسنه.", "Each person's worth lies in what they do well.", "علي بن أبي طالب", "Ali ibn Abi Talib", attr=True)
add("الظلم مؤذن بخراب العمران.", "Injustice heralds the ruin of civilisation.", "ابن خلدون — المقدمة", "Ibn Khaldun — Al-Muqaddimah")
add("الإنسان مدنيّ بالطبع.", "Man is social by nature.", "ابن خلدون — المقدمة", "Ibn Khaldun — Al-Muqaddimah")
add("على قدر أهل العزم تأتي العزائم، وتأتي على قدر الكرام المكارم.", "Resolve comes in the measure of the resolute, and noble deeds in the measure of the noble.", "المتنبي", "Al-Mutanabbi")
add("وما نيل المطالب بالتمنّي، ولكن تؤخذ الدنيا غِلابا.", "Goals are not won by wishing; the world is taken by striving.", "أحمد شوقي", "Ahmed Shawqi")
add("وإنما الأمم الأخلاق ما بقيت، فإن همُ ذهبت أخلاقهم ذهبوا.", "Nations endure as long as their morals endure; when their morals go, they go.", "أحمد شوقي", "Ahmed Shawqi")
add("إذا كنتَ في كلّ الأمور معاتبًا صديقَك، لم تلقَ الذي لا تعاتبه.", "If you reproach your friend over everything, you will never find one you need not reproach.", "بشار بن برد", "Bashar ibn Burd")


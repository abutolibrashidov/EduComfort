import json
import os
import sys

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def load_test(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading file {file_path}: {e}")
        return None

def print_separator():
    print("-" * 50)

def get_user_input(correct_answers, acceptable_variants=None):
    if acceptable_variants is None:
        acceptable_variants = []
    
    # Normalize answers for comparison (lowercase, stripped)
    valid_answers = [ans.lower().strip() for ans in correct_answers]
    valid_answers.extend([ans.lower().strip() for ans in acceptable_variants])
    
    while True:
        user_ans = input("Your answer (or press Enter to see solution): ").strip()
        
        if not user_ans:
            return False # User gave up/skipped
            
        if user_ans.lower() in valid_answers:
            print("✅ Correct!")
            return True
        else:
            print("❌ Incorrect. Try again.")

def run_fill_in_blanks_dialogue(question):
    print(f"\nInstructions: {question['instructions']}")
    if 'providedWords' in question['content']:
        print(f"Words: {', '.join(question['content']['providedWords'])}")
    for dialogue in question['content']['dialogues']:
        print(f"\nDialogue {dialogue.get('dialogueId', '')}:")
        for exchange in dialogue['exchanges']:
            speaker = exchange['speaker']
            print(f"{speaker}: ", end="")
            for blank in exchange['blanks']:
                before = blank.get('beforeText', '')
                prompt = blank.get('prompt', '')
                after = blank.get('afterText', '')
                
                print(f"{before}", end="")
                if prompt:
                    print(f" [{prompt}] ", end="")
                else:
                    print(" [___] ", end="")
                print(f"{after}", end=" ")
            print()
            
            # Interactive answering
            print(f"\n-- Answer for {speaker}'s line --")
            for blank in exchange['blanks']:
                 print(f"Blank {blank['blankId']}: ", end="")
                 start_prompt = blank.get('prompt', '')
                 if start_prompt:
                     print(f"({start_prompt})")
                 else:
                     print("(fill in the blank)")
                 
                 gave_up = not get_user_input(blank['correctAnswers'], blank.get('acceptableVariants', []))
                 if gave_up:
                     print(f"   -> Correct Answer: {', '.join(blank['correctAnswers'])}")

def run_verb_conjugation(question):
    print(f"\nInstructions: {question['instructions']}")
    if 'providedVerbs' in question['content']:
        print(f"Verbs: {', '.join(question['content']['providedVerbs'])}")
    for sentence in question['content']['sentences']:
        parts = []
        if 'beforeBlank' in sentence: parts.append(sentence['beforeBlank'])
        parts.append("[___]")
        if 'middleText' in sentence: parts.append(sentence['middleText'])
        if 'blank2' in sentence: parts.append("[___]")
        if 'afterBlank' in sentence: parts.append(sentence['afterBlank'])
        
        print(f"\n{sentence['sentenceId']}. {' '.join(parts)}")
        
        # Check blank 1
        print("Blank 1:")
        if 'blank1' in sentence:
             gave_up = not get_user_input(sentence['blank1']['correctAnswers'], sentence['blank1'].get('acceptableVariants', []))
             if gave_up:
                 print(f"   -> Answer: {', '.join(sentence['blank1']['correctAnswers'])}")
        
        # Check blank 2 if exists
        if 'blank2' in sentence:
             print("Blank 2:")
             gave_up = not get_user_input(sentence['blank2']['correctAnswers'], sentence['blank2'].get('acceptableVariants', []))
             if gave_up:
                 print(f"   -> Answer: {', '.join(sentence['blank2']['correctAnswers'])}")

def run_fill_verb_and_match(question):
    print(f"\nInstructions: {question['instructions']}")
    if 'providedVerbs' in question['content']:
        print(f"Verbs: {', '.join(question['content']['providedVerbs'])}")
    
    # Print options
    print("Match Options:")
    for opt in question['content']['options']:
        print(f"   {opt['id']}) {opt['text']}")

    for q in question['content']['questions']:
        print(f"\n{q['id']}. {q['text']}")
        
        print("Verb:")
        gave_up_verb = not get_user_input([q['correctVerb']])
        if gave_up_verb:
            print(f"   -> Verb: {q['correctVerb']}")
            
        print("Match:")
        gave_up_match = not get_user_input([q['correctMatch']])
        if gave_up_match:
            print(f"   -> Match: {q['correctMatch']}")


def run_error_correction(question):
    print(f"\nInstructions: {question['instructions']}")
    for s in question['content']['sentences']:
        print(f"\n{s['sentenceId']}. {s['sentence']}")
        print("Type the correction:")
        gave_up = not get_user_input([s['correction']], s.get('acceptableVariants', []))
        if gave_up:
            print(f"   -> Incorrect part: {s['incorrectPart']}, Correct: {s['correction']}")

def run_fill_in_blanks_simple(question):
    print(f"\nInstructions: {question['instructions']}")
    content = question['content']
    if 'providedWords' in content: 
         print(f"Words: {', '.join(content['providedWords'])}")
    elif 'options' in content:
         print(f"Options: {', '.join(content['options'])}")
    
    for s in content['sentences']:
        print(f"\n{s['sentenceId']}. {s['text']}")
        gave_up = not get_user_input(s['correctAnswers'], s.get('acceptableVariants', []))
        if gave_up:
            print(f"   -> Answer: {', '.join(s['correctAnswers'])}")

def run_fill_and_match(question):
    print(f"\nInstructions: {question['instructions']}")
    print(f"Adjectives: {', '.join(question['content']['providedAdjectives'])}")
    
    for item in question['content']['items']:
        print(f"\n{item['itemId']}. Clue: {item['clue']} | Context: {item['context']}")
        
        print("Target Word:")
        gave_up_word = not get_user_input([item['correctWord']])
        if gave_up_word:
             print(f"   -> Word: {item['correctWord']}")
             
        print("Adjective:")
        gave_up_adj = not get_user_input([item['correctAdjective']])
        if gave_up_adj:
             print(f"   -> Adjective: {item['correctAdjective']}")

def run_multiple_choice(question):
    print(f"\nInstructions: {question['instructions']}")
    for q in question['content'].get('questions', []):
        q_id = q.get('questionId', q.get('id', ''))
        print(f"\n{q_id}. {q['question']}")
        
        # Handle both object options (Unit 1) and string options (Unit 4)
        has_ids = False
        if len(q['options']) > 0 and isinstance(q['options'][0], dict):
             has_ids = True
             for opt in q['options']:
                 print(f"   {opt['id']}) {opt['text']}")
        else:
             # String options
             for idx, opt in enumerate(q['options']):
                 letter = chr(ord('a') + idx)
                 print(f"   {letter}) {opt}")
        
        # Determine correct answer for display logic if needed (runner uses get_user_input which takes list)
        correct = q.get('correctAnswers', [q.get('correctAnswer')])
        if not isinstance(correct, list): correct = [correct]
        
        gave_up = not get_user_input(correct, q.get('acceptableVariants', []))
        if gave_up:
             print(f"   -> Answer: {correct[0]}")

def run_dialogue_multiple_choice(question):
    print(f"\nInstructions: {question['instructions']}")
    dialogue = question['content']['dialogue']
    
    print("\n--- Dialogue ---")
    for line in dialogue:
        text_parts = [f"{line['speaker']}: {line['text']}"]
        if 'blank' in line:
            text_parts.append(f"[{line['blank']}]")
        if 'afterText' in line:
            text_parts.append(line['afterText'])
        if 'blank2' in line:
             text_parts.append(f"[{line['blank2']}]")
        if 'afterText2' in line:
            text_parts.append(line['afterText2'])
        print(" ".join(text_parts))
    
    print("\n--- Questions ---")
    for q in question['content']['questions']:
        print(f"\nBlank {q['blankNumber']}:")
        for opt in q['options']:
             print(f"   {opt['id']}) {opt['text']}")
        
        print("Select option:")
        gave_up = not get_user_input([q['correctAnswer']])
        if gave_up:
            print(f"   -> Correct: {q['correctAnswer']}")

def run_true_false_listening(question):
    print(f"\nInstructions: {question['instructions']}")
    print(f"(Audio file would play from: {question['content']['audioFile']})")
    
    for stmt in question['content']['statements']:
        print(f"\n{stmt['statementId']}. {stmt['text']}")
        print("True or False (T/F)?")
        gave_up = not get_user_input([stmt['correctAnswer']])
        if gave_up:
            print(f"   -> {stmt['correctAnswer']}")

def run_gap_fill_matching(question):
    print(f"\nInstructions: {question['instructions']}")
    print("\n--- Text with Gaps ---")
    for item in question['content']['textWithGaps']:
        if item['type'] == 'text':
            print(item['content'])
        elif item['type'] == 'gap':
            print(f"[{item['gapNumber']}]", end=" ")
    
    print("\n\n--- Sentences ---")
    for s in question['content']['sentences']:
        print(f"{s['id']}) {s['text']}")
        
    print("\nMatches required:")
    for k, v in question['content']['correctMatches'].items():
        print(f"Gap {k}: ", end="")
        gave_up = not get_user_input([v])
        if gave_up:
             print(f"   -> Gap {k}: {v}")

def run_guided_writing(question):
    print(f"\nInstructions: {question['instructions']}")
    print(f"Prompt: {question['content']['prompt']}")
    print("Requirements:")
    for req in question['content']['requirements']:
        print(f"- {req}")
    
    print("\n(Write your text offline or mentally draft it. Press Enter to continue.)")
    input()

def run_definition_matching(question):
    print(f"\nInstructions: {question['instructions']}")
    print(f"Words: {', '.join(question['content']['providedWords'])}")
    
    for d in question['content']['definitions']:
        print(f"\n{d['definitionId']}. {d['definition']}")
        gave_up = not get_user_input(d['correctAnswers'], d.get('acceptableVariants', []))
        if gave_up:
            print(f"   -> {', '.join(d['correctAnswers'])}")

def run_multiple_choice_vocabulary(question):
    print(f"\nInstructions: {question['instructions']}")
    for q in question['content']['questions']:
        print(f"\n{q['questionId']}. {q['sentence']}")
        print(f"   Options: {', '.join(q['options'])}")
        print("Type the correct option word:")
        gave_up = not get_user_input([q['correctAnswer']])
        if gave_up:
            print(f"   -> {q['correctAnswer']}")

def run_fill_in_blanks_conjugation(question):
    print(f"\nInstructions: {question['instructions']}")
    for s in question['content']['sentences']:
        before = s.get('beforeBlank', '')
        verb = s.get('verb', '')
        after = s.get('afterBlank', '')
        print(f"\n{s['sentenceId']}. {before} ({verb}) {after}")
        
        # User thinks (verb) is the answer, so we clarify instructions implicitly by asking for the conjugated form
        print(f"Type the correct form of '{verb}':")
        gave_up = not get_user_input(s['correctAnswers'], s.get('acceptableVariants', []))
        if gave_up:
            print(f"   -> {', '.join(s['correctAnswers'])}")

def run_verb_bank_fill(question):
    print(f"\nInstructions: {question['instructions']}")
    print(f"Verbs: {', '.join(question['content']['providedVerbs'])}")
    for s in question['content']['sentences']:
        before = s.get('beforeBlank', '')
        after = s.get('afterBlank', '')
        print(f"\n{s['sentenceId']}. {before} [___] {after}")
        
        gave_up = not get_user_input(s['correctAnswers'], s.get('acceptableVariants', []))
        if gave_up:
            print(f"   -> {', '.join(s['correctAnswers'])}")

def run_rewrite_negative(question):
    print(f"\nInstructions: {question.get('instructions', '')}")
    for item in question['content']['items']:
        # Support both 'itemId' and 'id' as keys
        item_id = item.get('itemId', item.get('id', ''))
        print(f"\n{item_id}. {item['original']}")
        print("Rewrite the sentence:")
        correct = [item['correctAnswer']]
        variants = item.get('acceptableVariants', [])
        gave_up = not get_user_input(correct, variants)
        if gave_up:
             print(f"   -> Answer: {item['correctAnswer']}")

def run_odd_one_out(question):
    print(f"\nInstructions: {question.get('instructions', '')}")
    for item in question['content']['items']:
        item_id = item.get('itemId', item.get('id', ''))
        print(f"\n{item_id}. Options: {', '.join(item['options'])}")
        print("Type the odd one out:")
        correct = [item['correctAnswer']]
        gave_up = not get_user_input(correct)
        if gave_up:
             print(f"   -> Answer: {item['correctAnswer']}")

def run_sentence_ordering(question):
    print(f"\nInstructions: {question.get('instructions', '')}")
    for item in question['content']['items']:
        print(f"\n{item.get('id', '')}. Words: {', '.join(item['words'])}")
        print("Type the full sentence:")
        correct = [item['correctSentence']]
        gave_up = not get_user_input(correct)
        if gave_up:
             print(f"   -> Answer: {item['correctSentence']}")

def run_matching(question):
    print(f"\nInstructions: {question.get('instructions', '')}")
    if 'providedOptions' in question['content']:
        print(f"Options: {', '.join(question['content']['providedOptions'])}")
    
    for item in question['content'].get('items', []):
        print(f"\n{item.get('id', '')}. {item['text']}")
        print("Match with option:")
        correct = [item['answer']]
        gave_up = not get_user_input(correct)
        if gave_up:
             print(f"   -> Answer: {item['answer']}")

def run_multiple_choice_gap_fill(question):
    print(f"\nInstructions: {question.get('instructions', '')}")
    for q in question['content'].get('questions', []):
        print(f"\n{q.get('id', '')}. {q['text']}")
        print(f"Options: {', '.join(q['options'])}")
        correct = [q['correctAnswer']]
        gave_up = not get_user_input(correct)
        if gave_up:
             print(f"   -> Answer: {q['correctAnswer']}")

def run_fill_in_blanks_text(question):
    print(f"\nInstructions: {question.get('instructions', '')}")
    text = question['content']['text']
    import re
    display_text = re.sub(r'\[blank\d+\]', '[___]', text)
    print(f"\n{display_text}\n")
    
    for blank in question['content']['blanks']:
        print(f"Blank {blank['id']}:")
        correct = [blank['answer']]
        gave_up = not get_user_input(correct)
        if gave_up:
             print(f"   -> Answer: {blank['answer']}")

def run_matching_paragraphs(question):
    print(f"\nInstructions: {question.get('instructions', '')}")
    content = question.get('content', {})
    if 'title' in content:
        print(f"\nTitle: {content['title']}")
    
    print("\nParagraphs:")
    for p in content.get('paragraphs', []):
        print(f"[{p['label']}] {p['text']}")
    
    print("\nQuestions:")
    for q in content.get('questions', []):
        print(f"\n{q.get('id', '')}. {q['text']}")
        print("Which paragraph? (Letter):")
        correct = [q['answer']]
        gave_up = not get_user_input(correct)
        if gave_up:
             print(f"   -> Answer: {q['answer']}")

def run_true_false(question):
    print(f"\nInstructions: {question.get('instructions', '')}")
    content = question.get('content', {})
    if 'title' in content:
        print(f"\nTitle: {content['title']}")
    if 'text' in content:
         print(f"\n{content['text']}\n")
    
    for stmt in content.get('statements', []):
        stmt_id = stmt.get('statementId', stmt.get('id', ''))
        print(f"{stmt_id}. {stmt['text']}")
        print("True or False (T/F)?")
        correct = [stmt['correctAnswer']]
        gave_up = not get_user_input(correct)
        if gave_up:
             print(f"   -> {stmt['correctAnswer']}")

def run_test(test_data):
    clear_screen()
    print(f"Title: {test_data['metadata']['title']}")
    print(f"Test ID: {test_data['testId']}")
    print_separator()
    
    for section in test_data['sections']:
        print(f"\nSECTION: {section['sectionName']} (Marks: {section['totalMarks']})")
        print_separator()
        
        for question in section['questions']:
            q_type = question['type']
            
            if q_type == 'fill-in-blanks-dialogue':
                run_fill_in_blanks_dialogue(question)
            elif q_type == 'verb-conjugation':
                run_verb_conjugation(question)
            elif q_type == 'error-correction':
                run_error_correction(question)
            elif q_type == 'fill-in-blanks-simple' or q_type == 'fill-in-blanks-initial' or q_type == 'fill-in-blanks-dropdown':
                run_fill_in_blanks_simple(question)
            elif q_type == 'fill-and-match':
                run_fill_and_match(question)
            elif q_type == 'multiple-choice':
                run_multiple_choice(question)
            elif q_type == 'dialogue-multiple-choice':
                run_dialogue_multiple_choice(question)
            elif q_type == 'true-false-listening':
                run_true_false_listening(question)
            elif q_type == 'true-false' or q_type == 'true-false-reading':
                 run_true_false(question)
            elif q_type == 'sentence-ordering' or q_type == 'instruction-sequencing':
                run_sentence_ordering(question) # instruction-sequencing can use similar logic if simple ordering
            elif q_type == 'matching' or q_type == 'activity-matching':
                run_matching(question)
            elif q_type == 'multiple-choice-gap-fill':
                run_multiple_choice_gap_fill(question)
            elif q_type == 'fill-in-blanks-text':
                run_fill_in_blanks_text(question)
            elif q_type == 'matching-paragraphs':
                run_matching_paragraphs(question)
            elif q_type == 'gap-fill-matching':
                run_gap_fill_matching(question)
            elif q_type == 'guided-writing':
                run_guided_writing(question)
            # New types Unit 8 & 9
            elif q_type in ['be-going-to-fill', 'play-go-do-fill', 'present-perfect-affirmative-fill', 'fill-in-blanks-conjugation', 'irregular-past-simple-fill', 'computing-verbs-fill', 'phrasal-verbs-particles', 'shop-dialogue-fill']:
                 run_fill_in_blanks_simple(question)
            
            elif q_type in ['word-bank-fill', 'past-simple-fill', 'verb-bank-fill', 'email-past-simple-fill', 'photo-description-prepositions', 'postcard-past-simple-fill', 'word-choice-email']:
                 run_text_fill_with_bank(question)

            elif q_type in ['multiple-choice-verb-form', 'word-choice-home', 'inline-choice']:
                 run_inline_choice(question)

            elif q_type == 'rewrite-negative':
                 run_rewrite_negative(question)
                 
            elif q_type == 'rewrite-sentence':
                 run_rewrite_negative(question)

            elif q_type == 'fill-verb-and-match':
                 run_fill_verb_and_match(question)

            elif q_type in ['first-letter-rooms', 'natural-world-first-letter', 'computing-nouns-first-letter', 'first-letter-fill']:
                 run_first_letter_fill(question)

            elif q_type in ['first-letter-rooms', 'natural-world-first-letter', 'computing-nouns-first-letter']:
                 run_first_letter_fill(question)

            elif q_type == 'present-perfect-dialogue':
                 run_fill_in_blanks_dialogue(question)

            elif q_type == 'modifiers-adjectives':
                 run_fill_and_match(question)

            elif q_type == 'cloze-text':
                 run_multiple_choice_gap_fill(question)

            elif q_type == 'speaker-matching':
                run_speaker_matching(question)

            elif q_type == 'text-multiple-choice':
                 run_text_multiple_choice(question)

            # Fallback for simple fill types if not caught above
            elif q_type in ['past-time-expression-choice', 'animal-body-parts-choice', 'past-simple-spelling-choice', 'irregular-past-choice', 'modifiers-choice']:
                run_inline_choice(question)

            else:
                print(f"Unknown question type: {q_type}")
            
            print_separator()
            input("Press Enter to continue to next question...")

def run_inline_choice(question):
    print(f"\nInstructions: {question.get('instructions', '')}")
    for s in question['content']['sentences']:
        before = s.get('beforeChoice', '')
        after = s.get('afterChoice', '')
        print(f"\n{s['sentenceId']}. {before} [___] {after}")
        print(f"   Options: {' / '.join(s['options'])}")
        
        gave_up = not get_user_input([s['correctAnswer']], s.get('acceptableVariants', []))
        if gave_up:
            print(f"   -> Answer: {s['correctAnswer']}")

def run_text_fill_with_bank(question):
    print(f"\nInstructions: {question.get('instructions', '')}")
    content = question['content']
    
    # Check for various provided word keys
    bank = []
    if 'providedVerbs' in content: bank = content['providedVerbs']
    elif 'providedWords' in content: bank = content['providedWords']
    elif 'providedParticles' in content: bank = content['providedParticles']
    elif 'wordBank' in content: bank = content['wordBank']
    
    if bank:
        print(f"Word Bank: {', '.join(bank)}")
    
    # Some texts are emails/postcards
    text = ""
    if 'emailText' in content: text = content['emailText']
    elif 'postcardText' in content: text = content['postcardText']
    elif 'text' in content: text = content['text']
    
    # Display text with blanks
    # Simple regex replacement for display if needed, but simple print is fine
    import re
    # Replace 1___ or [blank1] with [___] for display might be nice, but raw text is okay too
    # Let's try to make it look a bit better
    display_text = re.sub(r'(\d+_{3,})|(\[blank\d+\])', '[___]', text)
    if 'emailContext' in content:
        ctx = content['emailContext']
        print(f"\nFrom: {ctx.get('from','')}\nTo: {ctx.get('to','')}\nSubject: {ctx.get('subject','')}")
    print(f"\n{display_text}\n")
    
    # Loop blanks
    blanks = content.get('blanks', [])
    # Sort by ID just in case
    blanks.sort(key=lambda x: int(x.get('blankId', x.get('id', 0))))
    
    for blank in blanks:
        b_id = blank.get('blankId', blank.get('id'))
        print(f"Blank {b_id}:")
        gave_up = not get_user_input(blank['correctAnswers'], blank.get('acceptableVariants', []))
        if gave_up:
             print(f"   -> Answer: {blank['correctAnswers'][0]}")

def run_first_letter_fill(question):
    print(f"\nInstructions: {question.get('instructions', '')}")
    for s in question['content']['sentences']:
        print(f"\n{s['sentenceId']}. {s['text']}")
        print(f"(Starts with '{s['firstLetter']}')")
        gave_up = not get_user_input(s['correctAnswers'], s.get('acceptableVariants', []))
        if gave_up:
            print(f"   -> Answer: {s['correctAnswers'][0]}")

def run_speaker_matching(question):
    print(f"\nInstructions: {question.get('instructions', '')}")
    print(f"(Audio: {question['content'].get('audioFile', 'Unknown')})")
    
    statements = question['content']['statements']
    for stmt in statements:
        print(f"{stmt['id']}) {stmt['text']}")
        
    correct_matches = question['content']['correctMatches']
    # Iterate through speakers 1-5 or similar
    speakers = sorted([k for k in correct_matches.keys()])
    
    for spk in speakers:
        print(f"\nSpeaker {spk} matches statement (Letter):")
        gave_up = not get_user_input([correct_matches[spk]])
        if gave_up:
            print(f"   -> {correct_matches[spk]}")

def run_text_multiple_choice(question):
    print(f"\nInstructions: {question.get('instructions', '')}")
    content = question.get('content', {})
    
    # Display text with placeholders like [1], [2]
    print(f"\n{content.get('text', '')}\n")
    
    for q in content.get('questions', []):
        print(f"Gap {q['questionId']}:")
        # Display options A, B, C with text
        # Assuming variants like 'options': ['looks', 'seems', 'shows']
        # We can map them to A, B, C for display or just show them
        letters = ['A', 'B', 'C', 'D', 'E']
        for idx, opt in enumerate(q['options']):
            letter = letters[idx] if idx < len(letters) else '?'
            print(f"   {letter}) {opt}")
            
        print("Choose correct option (Word or Letter):")
        # Accept either the word or the letter/index
        correct_word = q['correctAnswer']
        variants = [correct_word]
        # Calculate letter for correct word
        try:
             idx = q['options'].index(correct_word)
             correct_letter = letters[idx]
             variants.append(correct_letter)
        except:
             pass
             
        gave_up = not get_user_input(variants)
        if gave_up:
            print(f"   -> {correct_word}")

def main():
    test_dir = os.path.dirname(os.path.abspath(__file__))
    valid_files = []
    
    # Recursively find JSON files
    for root, dirs, files in os.walk(test_dir):
        for f in files:
             if f.endswith('.json') and f != os.path.basename(__file__):
                 full_path = os.path.join(root, f)
                 # Store relative path for display
                 rel_path = os.path.relpath(full_path, test_dir)
                 valid_files.append(rel_path)

    print("Available Tests:")
    for idx, f in enumerate(valid_files):
        print(f"{idx + 1}. {f}")
    
    selection = input("\nSelect a test to run (number): ")
    try:
        idx = int(selection) - 1
        if 0 <= idx < len(valid_files):
            file_path = os.path.join(test_dir, valid_files[idx])
            data = load_test(file_path)
            if data:
                run_test(data)
        else:
            print("Invalid selection.")
    except ValueError:
        print("Please enter a number.")

if __name__ == "__main__":
    main()

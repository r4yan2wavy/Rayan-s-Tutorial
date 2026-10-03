import type {Question} from './assessment';

export const EDITING_SKILLS=['Grammar','Sentence structure','Organization','Revision'] as const;
export const EDITING_CONTENT_VERSION='editing-library-v2';

// Versioned IDs keep the wording and answer keys of already answered v1 items intact.
// Each level changes the editing task, not merely the vocabulary or its level label.
const contexts=[
  {name:'Mina',role:'volunteer',roles:'volunteers',item:'map',items:'maps',project:'garden survey'},
  {name:'Luis',role:'researcher',roles:'researchers',item:'sample',items:'samples',project:'water study'},
  {name:'Asha',role:'librarian',roles:'librarians',item:'catalog',items:'catalogs',project:'archive project'},
  {name:'Ben',role:'designer',roles:'designers',item:'model',items:'models',project:'bridge experiment'},
  {name:'Talia',role:'editor',roles:'editors',item:'draft',items:'drafts',project:'school publication'},
  {name:'Owen',role:'musician',roles:'musicians',item:'recording',items:'recordings',project:'sound exhibition'},
  {name:'Leila',role:'curator',roles:'curators',item:'photograph',items:'photographs',project:'history display'},
  {name:'Noah',role:'technician',roles:'technicians',item:'diagram',items:'diagrams',project:'robotics workshop'},
  {name:'Priya',role:'organizer',roles:'organizers',item:'schedule',items:'schedules',project:'community program'},
  {name:'Jamal',role:'naturalist',roles:'naturalists',item:'drawing',items:'drawings',project:'habitat investigation'},
];
type Draft={text:string;choices:[string,string,string,string];explanation:string;breakthrough:string;trap:string;reasons:[string,string,string,string];subskill:string};
type Context=(typeof contexts)[number];

function grammar(d:number,c:Context):Draft{
  const {name,item,items,role,roles,project}=c;
  if(d===1)return{
    text:`Choose the word that makes this sentence grammatically correct.\n\nThe ${item} on the table _____ to ${name}.`,
    choices:['belongs','belong','belonging','to belong'],
    explanation:`The subject is the singular noun “${item},” so the present-tense verb must be “belongs.” “On the table” does not change the subject.`,
    breakthrough:'Find the subject and choose a finite verb that agrees with it.',
    trap:'A participle or an infinitive cannot serve as the only main verb here.',
    reasons:['The singular subject agrees with “belongs.”','“Belong” does not agree with the singular subject.','“Belonging” needs an auxiliary verb.','“To belong” is an infinitive, not a finite main verb.'],
    subskill:'Singular subject–verb agreement',
  };
  if(d===2)return{
    text:`Choose the word that makes this sentence grammatically correct.\n\nEach of the ${items} used in ${name}'s ${project} _____ a label.`,
    choices:['has','have','having','were'],
    explanation:'“Each” is the singular subject; the plural noun inside the “of” phrase is not the subject. The sentence therefore requires “has.”',
    breakthrough:'Ignore a prepositional phrase between the subject and its verb.',
    trap:`The nearby plural noun “${items}” can distract from the actual subject, “Each.”`,
    reasons:['“Has” agrees with singular “Each.”','“Have” incorrectly agrees with the object of the preposition.','“Having” leaves the sentence without a finite verb.','“Were” is plural and does not fit the meaning “possesses a label.”'],
    subskill:'Agreement across an intervening phrase',
  };
  if(d===3)return{
    text:`Choose the word that makes this sentence grammatically correct.\n\nNeither the lead ${role} nor the other ${roles} _____ ready to begin ${name}'s ${project}.`,
    choices:['are','is','be','being'],
    explanation:`With subjects joined by “neither ... nor,” the verb agrees with the nearer subject. Here “${roles}” is plural, so “are” is correct.`,
    breakthrough:'For “either ... or” and “neither ... nor,” check the subject nearer the verb.',
    trap:'The first subject does not determine agreement when the nearer coordinated subject has a different number.',
    reasons:[`“Are” agrees with the nearer plural subject, “${roles}.”`,'“Is” agrees with the more distant singular noun rather than the nearer subject.','“Be” is not the required finite present-tense form.','“Being” lacks a finite auxiliary.'],
    subskill:'Agreement with coordinated subjects',
  };
  if(d===4)return{
    text:`Choose the word that makes this sentence grammatically correct.\n\nBeside the ${items} _____ a ${item} that ${name} forgot to include in the ${project}.`,
    choices:['lies','lie','lying','to lie'],
    explanation:`The subject follows the verb: “a ${item}.” It is singular, so “lies” is correct. “Beside the ${items}” is an introductory prepositional phrase.`,
    breakthrough:'In an inverted sentence, find the subject after the verb before deciding agreement.',
    trap:'Do not make the verb agree with the plural noun inside the introductory phrase.',
    reasons:['“Lies” agrees with the singular subject after it.','“Lie” wrongly treats the introductory plural noun as the subject.','“Lying” supplies a participle without a finite main verb.','“To lie” cannot function as the main verb in this construction.'],
    subskill:'Agreement in an inverted sentence',
  };
  return{
    text:`Choose the word that makes this sentence grammatically correct.\n\nThe collection of ${items}, including one that ${name} had restored after the ${project} ended, _____ the project's only surviving record.`,
    choices:['represents','represent','representing','are representing'],
    explanation:'The complete subject contains several plural words and an embedded clause, but its head is singular “collection.” The finite singular verb “represents” agrees with that head.',
    breakthrough:'Separate the main clause from embedded clauses, then identify the head of its subject.',
    trap:'A long modifier can hide the number of the main subject; neither “items” nor the embedded subject controls the main verb.',
    reasons:['“Represents” is a finite singular verb agreeing with “collection.”','“Represent” is plural and does not agree with the subject head.','“Representing” alone does not complete the main clause.','“Are representing” uses a plural auxiliary with a singular subject.'],
    subskill:'Agreement across embedded clauses',
  };
}

function structure(d:number,c:Context):Draft{
  const {name,item,items,project}=c;
  if(d===1)return{
    text:`Which revision corrects the fragment while preserving the relationship between these ideas?\n\nBecause the ${item} was damaged. ${name} made a copy for the ${project}.`,
    choices:[`Because the ${item} was damaged, ${name} made a copy for the ${project}.`,`Because the ${item} was damaged, making a copy for the ${project}.`,`The ${item} was damaged, ${name} made a copy for the ${project}.`,`Because the ${item} was damaged ${name}. Made a copy for the ${project}.`],
    explanation:'A clause beginning with “because” is dependent. Joining it to the complete main clause with a comma produces one complete sentence and preserves the reason for making a copy.',
    breakthrough:'A dependent clause needs an independent clause to complete its thought.',
    trap:'Putting a period after “because” does not make the dependent clause a complete sentence.',
    reasons:['The dependent clause is joined to a complete main clause.','“Making a copy” does not supply a main clause.','A comma alone cannot join these independent clauses.','The punctuation splits the subject from its predicate and leaves fragments.'],
    subskill:'Repairing a dependent-clause fragment',
  };
  if(d===2)return{
    text:`Which sentence correctly joins these two independent clauses?\n\n${name} compared the two ${items}. Their results did not match.`,
    choices:[`${name} compared the two ${items}; their results did not match.`,`${name} compared the two ${items}, their results did not match.`,`${name} compared the two ${items} their results did not match.`,`${name} compared the two ${items}; although their results did not match.`],
    explanation:'A semicolon can join two closely related independent clauses. A comma alone creates a comma splice, no punctuation creates a run-on, and adding “although” makes the second clause dependent.',
    breakthrough:'Check that both sides of a semicolon can stand as complete sentences.',
    trap:'A transition or subordinating word changes the kind of clause that follows it.',
    reasons:['Both clauses are independent and can be joined by a semicolon.','A comma alone creates a comma splice.','Independent clauses require a suitable connector or punctuation.','A semicolon cannot join this independent clause to an “although” fragment.'],
    subskill:'Punctuating independent clauses',
  };
  if(d===3)return{
    text:`Which revision gives the list a parallel grammatical structure?\n\nFor the ${project}, ${name}'s duties include measuring distances, recording observations, and to label the ${items}.`,
    choices:[`For the ${project}, ${name}'s duties include measuring distances, recording observations, and labeling the ${items}.`,`For the ${project}, ${name}'s duties include measuring distances, to record observations, and labeling the ${items}.`,`For the ${project}, ${name}'s duties include to measure distances, recording observations, and labels on the ${items}.`,`For the ${project}, ${name}'s duties include distances measured, to record observations, and labeling the ${items}.`],
    explanation:'All three duties should use matching grammatical forms. “Measuring,” “recording,” and “labeling” are parallel gerund phrases functioning as the objects of “include.”',
    breakthrough:'Compare the grammatical form of each item in a list.',
    trap:'Related meanings do not make a list grammatically parallel.',
    reasons:['All three listed duties use gerund phrases.','An infinitive interrupts the gerund list.','The list mixes an infinitive, a gerund, and a noun phrase.','The list mixes a participial construction, an infinitive, and a gerund.'],
    subskill:'Parallel structure in a series',
  };
  if(d===4)return{
    text:`Which revision corrects the misplaced modifier without changing the intended meaning?\n\nWhile reviewing the ${items} for the ${project}, an error was discovered by ${name}.`,
    choices:[`While reviewing the ${items} for the ${project}, ${name} discovered an error.`,`While reviewing the ${items} for the ${project}, an error discovered ${name}.`,`An error, while reviewing the ${items} for the ${project}, was discovered by ${name}.`,`While the error reviewed the ${items} for the ${project}, ${name} discovered it.`],
    explanation:`The introductory phrase describes the person doing the reviewing. Placing “${name}” immediately after the phrase correctly attaches it to that person, rather than to “an error.”`,
    breakthrough:'The subject after an introductory participial phrase must perform its action.',
    trap:'A passive sentence can leave an introductory modifier apparently describing the wrong noun.',
    reasons:['The reviewer is the subject immediately after the modifier.','The error cannot discover a person or review the items.','Moving the phrase does not identify a sensible reviewer.','This revision explicitly assigns the reviewing to an error.'],
    subskill:'Repairing a dangling modifier',
  };
  return{
    text:`Which revision preserves both the contrast and the intended meaning while correcting the modifier?\n\nAlthough the first ${item} appeared accurate, after comparing it with the original records, an omission was noticed by ${name}.`,
    choices:[`Although the first ${item} appeared accurate, ${name} noticed an omission after comparing it with the original records.`,`Although the first ${item} appeared accurate, after comparing it with the original records, an omission noticed ${name}.`,`${name} noticed an omission because the first ${item} appeared accurate after comparing it with the original records.`,`Although comparing it with the original records, the first ${item} appeared accurate, ${name} noticed an omission.`],
    explanation:'The correct revision names the comparer, keeps “it” connected to the first item, and retains the contrast signaled by “although.” It does not turn initial accuracy into the cause of the omission.',
    breakthrough:'Check modifier attachment, clause boundaries, and the logical relationship together.',
    trap:'A grammatical-looking rewrite may change contrast into cause or give a modifier the wrong subject.',
    reasons:['The actor, pronoun reference, and contrast are all preserved.','The omission is incorrectly presented as the actor.','“Because” changes the stated contrast into an unsupported causal relationship.','The modifier lacks a suitable actor and the main clauses form a comma splice.'],
    subskill:'Clause relationships and modifier attachment',
  };
}

function organization(d:number,c:Context):Draft{
  const {name,item,items,project}=c;
  if(d===1)return{
    text:`Which transition best connects these sentences?\n\n${name} planned to finish the ${project} on Friday. _____, a power outage delayed the work until Monday.`,
    choices:['However','For example','Similarly','Therefore'],
    explanation:'The second sentence describes an outcome that contrasts with the plan. “However” signals that contrast; the outage is not an example, a similarity, or a result of the plan.',
    breakthrough:'Identify the relationship between the ideas before choosing the transition.',
    trap:'A plausible-sounding connector must match the relationship expressed by both sentences.',
    reasons:['“However” introduces the contrast between plan and outcome.','The outage is not an example of finishing on Friday.','The sentences do not describe similar outcomes.','Planning to finish does not cause a power outage.'],
    subskill:'Transitions showing contrast',
  };
  if(d===2)return{
    text:`Choose the order that makes this paragraph easiest to follow.\n\n[1] Finally, ${name} placed the labeled ${items} in storage.\n[2] Before adding the labels, ${name} checked each ${item} against the original list.\n[3] Once the check was complete, ${name} attached the labels.`,
    choices:['2, 3, 1','1, 2, 3','3, 1, 2','2, 1, 3'],
    explanation:'The time references establish a required sequence: check before labeling, attach labels after the check, and store the labeled items finally.',
    breakthrough:'Use time markers and references to earlier actions to establish the order.',
    trap:'A sentence beginning “finally” cannot precede the steps it concludes.',
    reasons:['Checking leads to labeling, which leads to storage.','The final storage step is placed before preparation.','Labels are attached before the required check.','Storage occurs before the items receive labels.'],
    subskill:'Sequencing related sentences',
  };
  if(d===3)return{
    text:`Which sentence should be removed because it interrupts the paragraph's explanation of the comparison method?\n\n[1] For the ${project}, ${name} compared the accuracy of two kinds of ${items}.\n[2] Every ${item} was checked against the same reference.\n[3] After the project ended, the ${items} were moved to a larger storage room.\n[4] Using one reference made the comparison more consistent.`,
    choices:['Sentence 3','Sentence 1','Sentence 2','Sentence 4'],
    explanation:'The paragraph explains how a comparison was made consistent. Later storage arrangements do not explain the comparison method or its purpose, while the other sentences support that focus.',
    breakthrough:'State the paragraph’s central purpose, then ask what each sentence contributes.',
    trap:'A detail about the same materials is not automatically relevant to the specific purpose of the paragraph.',
    reasons:['Storage after the project does not develop the comparison method.','The opening establishes the comparison and project.','The common reference explains the method.','The final sentence explains why the method is useful.'],
    subskill:'Paragraph unity and relevance',
  };
  if(d===4)return{
    text:`Where should this sentence be inserted to make the paragraph most coherent?\n\nNew sentence: “That mismatch prompted ${name} to examine how the two sets had been produced.”\n\n[1] ${name} expected the new ${items} to agree with those from the earlier ${project}.\n[2] The new set consistently showed a higher value than the older set.\n[3] One set had been produced before the instrument was recalibrated; the other had been produced afterward.\n[4] The difference therefore reflected a change in measurement rather than a change in the object being measured.`,
    choices:['Between sentences 2 and 3','Before sentence 1','Between sentences 1 and 2','After sentence 4'],
    explanation:'“That mismatch” must follow the disagreement introduced in sentence 2. The new sentence then prepares for sentence 3, which gives the result of examining how the sets were produced.',
    breakthrough:'Check both a sentence’s backward reference and the idea it prepares the reader to encounter next.',
    trap:'A sentence with “that” needs a clear antecedent, and an investigation belongs before the explanation it produces.',
    reasons:['The mismatch has just been introduced, and the investigation leads into its cause.','The mismatch has not yet been introduced.','Only an expectation, not an actual mismatch, has been given.','The explanation is already complete, so the investigation arrives too late.'],
    subskill:'Sentence placement and reference',
  };
  return{
    text:`Which sentence provides the most logical transition between these paragraphs?\n\nParagraph 1: A pilot version of ${name}'s ${project} let participants submit comments online. Responses arrived sooner than in the previous paper process, and the staff recommended expanding it.\n\nParagraph 2: Several participants lacked reliable internet access. Staff therefore retained a paper option and compared results from both methods before making the online process permanent.`,
    choices:['Faster responses, however, did not establish that the pilot reached everyone who needed to participate.','The faster responses proved that every participant preferred the online process.','As a result, the staff could safely stop collecting responses from participants.','In addition, the paper used in the previous process came in several colors.'],
    explanation:'The transition acknowledges the evidence for speed but limits the conclusion that can be drawn from it. That qualification leads logically to the access concern and combined method in paragraph 2.',
    breakthrough:'A transition between arguments should show how the later evidence qualifies or develops the earlier claim.',
    trap:'A positive result on one measure does not prove universal access or justify an unrelated conclusion.',
    reasons:['The qualification links faster responses to the separate question of participation.','Response speed does not prove every participant’s preference.','Stopping responses conflicts with the purpose of both paragraphs.','Paper colors do not connect the speed finding with internet access.'],
    subskill:'Qualifying an argument across paragraphs',
  };
}

function revision(d:number,c:Context):Draft{
  const {name,item,items,project}=c;
  if(d===1)return{
    text:`Which revision is clearest and removes unnecessary repetition?\n\n${name} made a plan to prepare and get ready to organize the ${items}.`,
    choices:[`${name} planned to organize the ${items}.`,`${name} prepared preparation for organizing the ${items}.`,`${name} planned a plan to get ready and organize the ${items}.`,`${name} made ready plans that were ready to organize the ${items}.`],
    explanation:'“Planned to organize” states the intended action directly. “Prepare and get ready” repeats one idea, and the other revisions retain or add repetition.',
    breakthrough:'Preserve the essential action while removing words that repeat the same idea.',
    trap:'A shorter sentence is useful only when it keeps the meaning and has a clear subject and verb.',
    reasons:['The direct verb preserves the intended action without repetition.','“Prepared preparation” repeats one idea.','“Planned a plan” and “get ready” retain unnecessary wording.','“Ready plans that were ready” is repetitive and awkward.'],
    subskill:'Concision without loss of meaning',
  };
  if(d===2)return{
    text:`Which revision makes the intended reference clearest? The intended meaning is that the assistant, not ${name}, will present the ${project}.\n\nWhen ${name} met the assistant, they agreed that they would present the ${project}.`,
    choices:[`When ${name} met the assistant, they agreed that the assistant would present the ${project}.`,`When ${name} met the assistant, they agreed that they would present it.`,`When ${name} met them, they agreed that they would present the ${project}.`,`When ${name} met the assistant, the ${project} agreed to be presented.`],
    explanation:'Repeating “the assistant” for the presenter removes the ambiguity without changing who meets or what they decide. The other versions keep the unclear pronoun or assign a decision to the project.',
    breakthrough:'Replace an ambiguous pronoun with the precise noun when more than one antecedent is possible.',
    trap:'Replacing one pronoun with another does not establish who performs the action.',
    reasons:['Naming the assistant identifies the intended presenter.','The second “they” still has more than one possible reference.','Both people and the presenter remain unclear.','A project cannot agree to a decision.'],
    subskill:'Clarifying an ambiguous pronoun',
  };
  if(d===3)return{
    text:`Which revision reports the evidence most precisely without adding an unsupported claim?\n\nNotes from ${name}'s ${project}: 12 of the 20 tested ${items} met the stated accuracy standard. The remaining 8 did not.\n\nDraft sentence: “The test showed that the ${items} were good.”`,
    choices:[`Twelve of the 20 tested ${items} met the stated accuracy standard.`,`All ${items} used in the project were completely accurate.`,`Most ${items} will meet every standard in future tests.`,`The test proved that the eight other ${items} could never be improved.`],
    explanation:'The correct revision replaces vague “good” with the measured outcome and exact sample size. It does not extend the result to all items, future standards, or permanent limits.',
    breakthrough:'Choose precise wording that stays within the evidence’s sample and measured outcome.',
    trap:'A result from one test cannot establish universal or permanent conclusions.',
    reasons:['The exact number and tested standard match the notes.','Only 12 of the tested 20 met the standard.','The notes do not predict future results or every standard.','Failing this test does not establish that improvement is impossible.'],
    subskill:'Precision and evidence-based wording',
  };
  if(d===4)return{
    text:`Which revision best suits a formal report while preserving the two facts in the notes?\n\nNotes: ${name} found that one ${item} was incomplete. The rest of the ${items} could still be used in the ${project}.\n\nDraft: “One ${item} was a total mess, but the rest were awesome enough to use.”`,
    choices:[`One ${item} was incomplete, but the remaining ${items} were usable for the ${project}.`,`All of the ${items} were useless because one was incomplete.`,`The incomplete ${item} was awesome, and none of the others could be used.`,`One ${item} was unbelievably terrible, although the rest were super great.`],
    explanation:'The correct revision uses neutral, specific language and preserves the distinction between the incomplete item and the usable remainder. The other choices change the findings or retain informal exaggeration.',
    breakthrough:'Match the tone to the audience while preserving the original facts and their relationship.',
    trap:'Changing tone should not exaggerate findings or reverse the contrast.',
    reasons:['Neutral language communicates both stated findings accurately.','One incomplete item does not make every item unusable.','This reverses both findings.','The exaggerated evaluative wording remains unsuitable for a formal report.'],
    subskill:'Formal tone and accurate synthesis',
  };
  return{
    text:`Which revision is most concise while preserving the limits and comparison in this finding?\n\nIn the small initial sample for ${name}'s ${project}, the revised method produced more consistent measurements than the earlier method, but the limited size of that initial sample means that it does not by itself establish that the revised method would produce better measurements under every possible condition.`,
    choices:[`In the small initial sample for ${name}'s ${project}, the revised method produced more consistent measurements than the earlier method, but this result does not establish its superiority under all conditions.`,`The revised method produced more consistent measurements and is superior under all conditions.`,`Because the sample was small, the revised method could not produce more consistent measurements.`,`The revised method was different from the earlier method, so no comparison between them was possible.`],
    explanation:'The correct revision retains the observed improvement, the limited sample, and the restriction on generalizing to all conditions. It removes repeated phrasing without treating the limitation as proof that the observed finding is false.',
    breakthrough:'Identify the finding, comparison, and qualification before removing repeated language.',
    trap:'Concision must retain qualifications; uncertainty about a general claim does not negate the observed result.',
    reasons:['The observed comparison and its scope limitation are both preserved.','The qualification is deleted and the claim becomes universal.','The limited sample does not contradict the observed consistency.','Different methods can still be compared, as the original finding does.'],
    subskill:'Concision with a qualified conclusion',
  };
}

export function editingBatch():Question[]{
  const items:Question[]=[];
  const authors=[grammar,structure,organization,revision];
  for(let difficulty=1;difficulty<=5;difficulty++)for(let contextIndex=0;contextIndex<contexts.length;contextIndex++)for(let skillIndex=0;skillIndex<EDITING_SKILLS.length;skillIndex++){
    const draft=authors[skillIndex](difficulty,contexts[contextIndex]);
    const shift=(contextIndex+difficulty+skillIndex)%4;
    const rotate=<T,>(values:readonly T[])=>values.slice(shift).concat(values.slice(0,shift));
    const item:Question={
      id:`edit-v2-${difficulty}-${contextIndex*4+skillIndex}`,
      subject:'ELA',skill:EDITING_SKILLS[skillIndex],difficulty,
      text:draft.text,choices:rotate(draft.choices),correct:(4-shift)%4,
      explanation:draft.explanation,breakthrough:draft.breakthrough,
      commonTrap:draft.trap,distractorReasons:rotate(draft.reasons),
      subskill:draft.subskill,generationMethod:'offline-authored-editing-v2',type:'mc',
    };
    items.push(item);
  }
  return items;
}

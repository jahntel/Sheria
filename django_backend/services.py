# django_backend/services.py
"""
SPDX-License-Identifier: Apache-2.0
Jua Sheria Django Services - KenyanLegalFetchService mimicking Laws.Africa API
"""

LAWS_DATABASE = [
    {
        "id": "const-art2",
        "actName": "The Constitution of Kenya 2010",
        "section": "Article 2",
        "title": "Supremacy of the Constitution",
        "text": "This Constitution is the supreme law of the Republic and binds all persons and all State organs at both levels of government. No person may claim or exercise State authority except as authorised under this Constitution. Any law, including customary law, that is inconsistent with this Constitution is void to the extent of the inconsistency, and any act or omission in contravention of this Constitution is invalid.",
    },
    {
        "id": "const-art27",
        "actName": "The Constitution of Kenya 2010",
        "section": "Article 27",
        "title": "Equality and freedom from discrimination",
        "text": "Every person is equal before the law and has the right to equal protection and equal benefit of the law. Equality includes the full and equal enjoyment of all rights and fundamental freedoms. Women and men have the right to equal treatment, including the right to equal opportunities in political, economic, cultural and social spheres. The State shall not discriminate directly or indirectly against any person on any ground, including race, sex, pregnancy, marital status, health status, ethnic or social origin, colour, age, disability, religion, conscience, belief, culture, dress, language or birth.",
    },
    {
        "id": "const-art40",
        "actName": "The Constitution of Kenya 2010",
        "section": "Article 40",
        "title": "Right to property",
        "text": "Subject to Article 65, every person has the right, either individually or in association with others, to acquire and own property of any description and in any part of Kenya. The State shall not deprive a person of property of any description, or of any interest in or right over property of any description, unless the deprivation is for a public purpose and is carried out in accordance with this Constitution, prompt payment of full and just compensation is made, and any person who has an interest in, or right over, that property has a right of access to a court of law.",
    },
    {
        "id": "const-art41",
        "actName": "The Constitution of Kenya 2010",
        "section": "Article 41",
        "title": "Labour relations",
        "text": "Every person has the right to fair labour practices. Every worker has the right to fair remuneration, to reasonable working conditions, to form, join or participate in the activities and programmes of a trade union, and to go on strike. Every employer has the right to form and join an employers' organisation, and to participate in the activities and programmes of an employers' organisation.",
    },
    {
        "id": "const-art43",
        "actName": "The Constitution of Kenya 2010",
        "section": "Article 43",
        "title": "Economic and social rights",
        "text": "Every person has the right to the highest attainable standard of health, which includes the right to health care services, including reproductive health care; to accessible and adequate housing, and to reasonable standards of sanitation; to be free from hunger, and to have adequate food of acceptable quality; to clean and safe water in adequate quantities; to social security; and to education. A person shall not be denied emergency medical treatment.",
    },
    {
        "id": "emp-sec5",
        "actName": "The Employment Act, 2007",
        "section": "Section 5",
        "title": "Equality and discrimination",
        "text": "An employer shall promote equal opportunity in employment and strive to eliminate discrimination in any employment policy or practice. An employer shall register and submit to the Director of Employment a report regarding discrimination patterns. No employer shall discriminate directly or indirectly against an employee or prospective employee on grounds of race, color, sex, language, religion, political or other opinion, nationality, ethnic or social origin, disability, pregnancy, mental status or HIV status.",
    },
    {
        "id": "emp-sec26",
        "actName": "The Employment Act, 2007",
        "section": "Section 26",
        "title": "Minimum conditions of employment",
        "text": "This Part shall constitute basic minimum conditions of employment and shall apply to all employees. Any contract of service that provides for terms that are less favorable to the employee than the minimum conditions prescribed herein shall be deemed to be modified to conform to the statutory minimum conditions.",
    },
    {
        "id": "emp-sec29",
        "actName": "The Employment Act, 2007",
        "section": "Section 29",
        "title": "Maternity leave",
        "text": "A female employee shall be entitled to three months' maternity leave with full pay. She shall give her employer not less than seven days' written notice of her intention to proceed on maternity leave. On expiry of maternity leave, she shall have the right to return to the job which she held immediately before her maternity leave or to a reasonably suitable job on terms and conditions which are not less favorable.",
    },
    {
        "id": "emp-sec35",
        "actName": "The Employment Act, 2007",
        "section": "Section 35",
        "title": "Termination of employment",
        "text": "Where a contract of service is to be terminated, it shall be terminated as follows: (a) where the contract is for a period of less than a month, it may be terminated by either party on twenty-four hours' notice; (b) where the contract is a monthly contract, by not less than twenty-eight days' notice or payment in lieu of notice; (c) where the contract is for a fixed period or specific task, on expiry or completion.",
    },
    {
        "id": "landlord-sec4",
        "actName": "The Landlord and Tenant Act",
        "section": "Section 4",
        "title": "Restrictions on increasing rent and changing tenancy",
        "text": "No landlord shall increase the rent of any premises, or alter any terms of tenancy, or evict a tenant without first serving a notice of increment or change in the prescribed statutory form, or by obtaining a corresponding consent from the tenant. Any dispute concerning rent increments or unilateral alterations shall be referred to the Rent Restriction Tribunal for adjudication.",
    },
    {
        "id": "landlord-sec12",
        "actName": "The Landlord and Tenant Act",
        "section": "Section 12",
        "title": "Landlord obligations to maintain premises",
        "text": "It is an implied covenant in every tenancy agreement that the landlord is responsible for keeping the premises in a good state of repair and fit for human habitation. The landlord shall undertake structural repairs, water and drainage system maintenance, and common area upkeep. If the landlord fails, the tenant may seek remedy from the Tribunal, or seek authorization to repair and deduct costs from rent.",
    },
    {
        "id": "landlord-sec15",
        "actName": "The Landlord and Tenant Act",
        "section": "Section 15",
        "title": "Tenant obligations",
        "text": "The tenant shall pay the rent on the dates and in the manner agreed. The tenant shall maintain the interior of the premises in a clean and tenantable condition, repair damage caused by direct negligence, and shall not assign, sublet, or part with possession of the premises without prior written consent from the landlord.",
    },
    {
        "id": "penal-sec203",
        "actName": "The Penal Code",
        "section": "Section 203",
        "title": "Murder",
        "text": "Any person who of malice aforethought causes the death of another person by an unlawful act or omission is guilty of murder and shall, upon conviction, be sentenced to death, subject to constitutional guidelines on capital punishment and statutory reviews.",
    },
    {
        "id": "penal-sec268",
        "actName": "The Penal Code",
        "section": "Section 268",
        "title": "Theft defined",
        "text": "A person who fraudulently and without claim of right takes anything capable of being stolen, or fraudulently converts to the use of any person other than the general or special owner thereof, steals that thing. A taking is deemed fraudulent if it is done with intent to permanently deprive the owner, or to use the thing as security, or to deal with it in a manner that cannot be resolved without risk of loss to the owner.",
    },
]

class KenyanLegalFetchService:
    @staticmethod
    def lookup_laws(query: str):
        q = query.lower()
        matched_ids = set()
        
        # Mapping keywords to IDs
        keywords_map = [
            ({"discrim", "equal", "fair", "tribe", "tribunal", "bias"}, {"const-art27", "emp-sec5", "landlord-sec4"}),
            ({"fire", "dismiss", "terminat", "contract", "notice", "job", "work"}, {"emp-sec35", "emp-sec26", "const-art41"}),
            ({"maternity", "pregnant", "birth", "baby", "leave"}, {"emp-sec29", "const-art27"}),
            ({"rent", "landlord", "tenant", "evict", "house", "apartment", "lease"}, {"landlord-sec4", "landlord-sec12", "landlord-sec15"}),
            ({"property", "land", "own", "asset"}, {"const-art40"}),
            ({"social", "health", "water", "food", "education", "rights"}, {"const-art43"}),
            ({"labor", "remuneration", "strike", "union", "salary", "wage"}, {"const-art41", "emp-sec26"}),
            ({"murder", "kill", "death"}, {"penal-sec203"}),
            ({"theft", "steal", "stolen", "rob"}, {"penal-sec268"}),
        ]
        
        for terms, ids in keywords_map:
            if any(term in q for term in terms):
                matched_ids.update(ids)
                
        # Direct section matching
        if "article 27" in q or "art 27" in q:
            matched_ids.add("const-art27")
        if "article 2" in q:
            matched_ids.add("const-art2")
        if "article 40" in q or "art 40" in q:
            matched_ids.add("const-art40")
        if "article 41" in q or "art 41" in q:
            matched_ids.add("const-art41")
        if "article 43" in q or "art 43" in q:
            matched_ids.add("const-art43")
        if "section 5" in q:
            matched_ids.add("emp-sec5")
        if "section 26" in q:
            matched_ids.add("emp-sec26")
        if "section 29" in q:
            matched_ids.add("emp-sec29")
        if "section 35" in q:
            matched_ids.add("emp-sec35")
        if "section 4" in q or "rent restriction" in q:
            matched_ids.add("landlord-sec4")
        if "section 12" in q or "habitability" in q or "repair" in q:
            matched_ids.add("landlord-sec12")
        if "section 15" in q or "tenant obligation" in q:
            matched_ids.add("landlord-sec15")
        if "section 203" in q or "murder" in q:
            matched_ids.add("penal-sec203")
        if "section 268" in q or "theft" in q:
            matched_ids.add("penal-sec268")
            
        results = []
        for id_val in matched_ids:
            match = next((law for law in LAWS_DATABASE if law["id"] == id_val), None)
            if match:
                results.append(match)
                
        # Fallback default laws
        if not results:
            d1 = next((law for law in LAWS_DATABASE if law["id"] == "const-art2"), None)
            d2 = next((law for law in LAWS_DATABASE if law["id"] == "const-art27"), None)
            if d1: results.append(d1)
            if d2: results.append(d2)
            
        return results

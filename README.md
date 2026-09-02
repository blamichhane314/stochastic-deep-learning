# Stochastic deep learning

A public study companion for twenty-eight landmark papers in generative modelling, from
Boltzmann machines (1985) to diffusion transformers (2023). Built alongside a graduate
seminar, and meant to be useful to anyone reading this material.

Open `index.html` in a browser. No build step, no dependencies, no server required —
though a static server avoids browser file-URL quirks:

```
python3 -m http.server 8000
```

## What is here

- **Timeline** — the twenty-eight papers in the order they are read, across ten sessions.
- **Papers** and **Concepts** — every paper's links to the ideas it uses, introduces,
  extends, replaces, is motivated by, evaluates with, or names as its own limitation.
- **Connections** — the papers, the concepts, and every link between them.
- **Experiments** — not yet written. This section will hold small runnable pieces that go
  beyond the papers, with saved data and code, once there is something worth standing behind.

## The rule this is built on

**Nothing on a reading surface is written by a machine.** Every description of a paper is a
verbatim quotation from that paper, shown inside the passage it came from, and checked
character-by-character against the source text before it was allowed into the data. Where
the surrounding passage could not be recovered from the PDF, the page says so rather than
hiding it.

Language models were used for one thing only: **finding which passages evidence which
relations, across twenty-eight papers at once**. They do not write prose that anyone reads
here. Every link carries its `method` — `citation` for links parsed out of a paper's own
bibliography, `genai` for links a model located and a checker verified.

## How the data was made

1. Text extracted from each PDF with `pdftotext`; all twenty-eight titles verified against
   their own files.
2. `tools/parse_citations.py` — citation links matched out of each paper's bibliography.
   No model involved, so nothing here can be invented.
3. A controlled vocabulary of concepts, frozen before any reading began.
4. One agent per paper, each writing only its own file, each required to attach a verbatim
   quote to every claim.
5. `tools/merge_extractions.py` — every quote re-checked against its source. Any claim whose
   quote is not found verbatim is dropped and logged.
6. `tools/build_site_data.py` — assembles `data/graph.json` and the page bundle, and locates
   the surrounding passage for each quote.

## What is verified, and what is not

**Verified:** every quotation exists, verbatim, in the paper it is attributed to. Every
citation link was parsed from a real bibliography entry. All twenty-eight papers, session
dates, and titles were checked against the sources.

**Not yet verified:** whether each quotation *supports the relation label attached to it*.
A correct quote can sit under a wrong label. An adversarial checking pass is planned and has
not run.

**Known gaps.** Some links are missing because the mathematics did not survive text
extraction — several older PDFs render equations as mangled characters, so a claim that
lives only inside a formula has no quotable evidence and was deliberately left out rather
than guessed at. Twenty concepts were added to the vocabulary after the first reading pass
and have no links yet; they appear dimmed until the papers are re-read for them.

## The papers themselves

Not included. These are published works under various copyrights — follow the DOI or arXiv
link on each paper's page.

## Licence

Code is MIT (`LICENSE`). The writing, the concept vocabulary, and the extracted relation data
are CC BY 4.0 (`LICENSE-CONTENT`).

Quotations from the twenty-eight papers remain the property of their authors and publishers and
appear here as short excerpts for study and commentary. The papers themselves are not included;
each links to its publisher or arXiv record.

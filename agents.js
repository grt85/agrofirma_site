const SYNONYMS = require("./synonyms");
const KB = require("./knowledgeBase");

function hasKeyword(text, keywords = []) {
  return keywords.some(word =>
    text.includes(word)
  );
}

async function localAgent(question) {

  const q = String(question || "")
    .toLowerCase()
    .trim();

  // Стартове меню

  if (!q || q === "privet") {
    return {
      answer: {
        text: KB.greeting.text
      },
      buttons: KB.greeting.buttons
    };
  }

  // ======================
  // ACTION BUTTONS
  // ======================

  if (q === "products") {
    return {
      answer: {
        text: KB.products
      }
    };
  }

  if (q === "prices") {
    return {
      answer: {
        text: KB.prices
      }
    };
  }

  if (q === "delivery") {
    return {
      answer: {
        text: KB.delivery
      }
    };
  }

  if (q === "contacts") {
    return {
      answer: {
        text: KB.contacts
      }
    };
  }

  if (q === "address") {
    return {
      answer: {
        text: KB.address
      }
    };
  }

  if (q === "schedule") {
    return {
      answer: {
        text: KB.schedule
      }
    };
  }

  if (q === "quality") {
    return {
      answer: {
        text: KB.quality
      }
    };
  }

  if (q === "cooperation") {
    return {
      answer: {
        text: KB.cooperation
      }
    };
  }

  // ======================
  // SYNONYMS
  // ======================

  if (hasKeyword(q, SYNONYMS.products)) {
    return {
      answer: {
        text: KB.products
      }
    };
  }

  if (hasKeyword(q, SYNONYMS.prices)) {
    return {
      answer: {
        text: KB.prices
      }
    };
  }

  if (hasKeyword(q, SYNONYMS.delivery)) {
    return {
      answer: {
        text: KB.delivery
      }
    };
  }

  if (hasKeyword(q, SYNONYMS.contacts)) {
    return {
      answer: {
        text: KB.contacts
      }
    };
  }

  if (hasKeyword(q, SYNONYMS.address)) {
    return {
      answer: {
        text: KB.address
      }
    };
  }

  if (hasKeyword(q, SYNONYMS.schedule)) {
    return {
      answer: {
        text: KB.schedule
      }
    };
  }

  if (hasKeyword(q, SYNONYMS.quality)) {
    return {
      answer: {
        text: KB.quality
      }
    };
  }

  if (hasKeyword(q, SYNONYMS.cooperation)) {
    return {
      answer: {
        text: KB.cooperation
      }
    };
  }

  // ======================
  // FALLBACK
  // ======================

  return {
    answer: {
      text: KB.fallback
    },
    buttons: KB.greeting.buttons
  };
}

module.exports = {
  localAgent
};
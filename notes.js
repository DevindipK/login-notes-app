document.addEventListener('DOMContentLoaded', () => {
  const noteForm = document.getElementById('noteForm');
  const noteContent = document.getElementById('noteContent');
  const notesList = document.getElementById('notesList');
  const logoutBtn = document.getElementById('logoutBtn');

  const feedbackEl = document.createElement('div');
  feedbackEl.style.color = 'green';
  feedbackEl.style.margin = '10px 0';
  noteForm.parentNode.insertBefore(feedbackEl, noteForm.nextSibling);

  function showFeedback(message) {
    feedbackEl.textContent = message;
    setTimeout(() => {
      feedbackEl.textContent = '';
    }, 3000);
  }
  function createNoteElement(note) {
  const noteDiv = document.createElement('div');
  noteDiv.classList.add('note');
  noteDiv.style.display = 'flex';
  noteDiv.style.alignItems = 'center';
  noteDiv.style.margin = '6px 0';
  const contentSpan = document.createElement('span');
  contentSpan.textContent = note.content;
  contentSpan.style.flexGrow = '1';
  contentSpan.style.padding = '8px 12px';
  contentSpan.style.borderRadius = '5px';
  contentSpan.style.backgroundColor = '#f9f9f9';
  contentSpan.style.border = '1px solid #ccc';
  contentSpan.style.fontSize = '14px';
  contentSpan.style.display = 'inline-block';

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.classList.add('delete-btn');
  deleteBtn.style.marginLeft = '10px';

  deleteBtn.addEventListener('click', () => {
    fetch(`/api/notes/${note.id}`, { method: 'DELETE' })
    .then(response => {
      if (response.ok) {
        notesList.removeChild(noteDiv);
        showFeedback('Message deleted');
      } else {
            console.error('Failed to delete note');
          }
        })
        .catch(err => console.error('Error deleting note:', err));
    });

  noteDiv.appendChild(contentSpan);
  noteDiv.appendChild(deleteBtn);

  return noteDiv;
  }

  function displayNotes(notes) {
    notesList.innerHTML = '';
    notes.forEach(note => {
      const noteElement = createNoteElement(note);
      notesList.appendChild(noteElement);
    });
  }

  fetch('/api/notes')
    .then(response => response.json())
    .then(data => displayNotes(data))
    .catch(err => console.error('Error fetching notes:', err));

  noteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = noteContent.value.trim();
    if (!content) return;

  fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    .then(response => response.json())
    .then(newNote => {
      const noteElement = createNoteElement(newNote);
      notesList.appendChild(noteElement);
      noteContent.value = '';
      showFeedback('Message added');
    })
    .catch(err => console.error('Error adding note:', err));
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.location.href = 'index.html'; 
    });
  }
});
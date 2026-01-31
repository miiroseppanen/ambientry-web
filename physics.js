// Physics layout and drag behavior for the tile grid.
const initPhysics = (container) => {
  if (!container) {
    return;
  }
  const tiles = Array.from(container.querySelectorAll(".section"));
  const containerRect = container.getBoundingClientRect();
  const states = tiles.map((tile, index) => {
    const rect = tile.getBoundingClientRect();
    const x = rect.left - containerRect.left;
    const y = rect.top - containerRect.top;
    const content = tile.querySelector(".section-content");
    const styles = getComputedStyle(tile);
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
    const contentHeight = content ? content.scrollHeight : 0;
    const baseHeight =
      contentHeight > 0 ? contentHeight + paddingTop + paddingBottom : rect.height;
    const height = Math.max(baseHeight, 1);
    const image = content ? content.querySelector("img") : null;
    const state = {
      tile,
      content,
      image,
      x,
      y,
      width: rect.width,
      height,
      order: index,
      columnIndex: 0,
      vx: 0,
      vy: 0,
      floatSpeed: 4 + Math.random() * 8,
      dragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      lastMoveX: 0,
      lastMoveY: 0,
      lastMoveTime: 0,
      startY: y,
      targetY: y,
      paddingTop,
      paddingBottom,
    };
    return state;
  });

  const maxBottom = Math.max(
    ...states.map((state) => state.y + state.height),
    0
  );
  container.style.height = `${maxBottom}px`;
  container.classList.add("is-physics");

  function updateTileHeight(state) {
    const contentHeight = state.content
      ? Math.max(
          state.content.scrollHeight,
          state.content.getBoundingClientRect().height
        )
      : 0;
    const nextHeight = contentHeight + state.paddingTop + state.paddingBottom;
    if (nextHeight > 0 && nextHeight !== state.height) {
      state.height = nextHeight;
      state.tile.style.height = `${state.height}px`;
    }
  }

  const assignColumns = () => {
    const avgWidth =
      states.reduce((sum, state) => sum + state.width, 0) /
      Math.max(states.length, 1);
    const gap = 24;
    const columnWidth = avgWidth + gap;
    states.forEach((state) => {
      state.columnIndex = columnWidth > 0 ? Math.round(state.x / columnWidth) : 0;
    });
  };

  const computeTargets = () => {
    states.forEach(updateTileHeight);
    assignColumns();
    const columns = new Map();
    states.forEach((state) => {
      if (!columns.has(state.columnIndex)) {
        columns.set(state.columnIndex, []);
      }
      columns.get(state.columnIndex).push(state);
    });

    let maxBottom = 0;
    columns.forEach((columnStates) => {
      columnStates.sort((a, b) => a.order - b.order);
      let cursorY = 0;
      columnStates.forEach((state) => {
        state.targetY = cursorY;
        cursorY += state.height + 8;
      });
      maxBottom = Math.max(maxBottom, cursorY);
    });
    container.style.height = `${Math.max(maxBottom, container.clientHeight)}px`;
  };

  states.forEach((state) => {
    const { tile, x, y, width, height } = state;
    tile.style.position = "absolute";
    tile.style.left = `${x}px`;
    tile.style.top = `${y}px`;
    tile.style.width = `${width}px`;
    tile.style.height = `${height}px`;
    if (state.image) {
      if (state.image.complete) {
        updateTileHeight(state);
        if (floatActive) {
          computeStackTargets();
        }
      } else {
        state.image.addEventListener(
          "load",
          () => {
            updateTileHeight(state);
            if (floatActive) {
              computeStackTargets();
            }
          },
          { once: true }
        );
      }
    }
  });

  let lastTime = performance.now();
  let floatActive = false;
  let floatTimer = null;
  let suppressScroll = false;

  const clampPosition = (state) => {
    const maxX = Math.max(container.clientWidth - state.width, 0);
    const maxY = Math.max(container.clientHeight - state.height, 0);
    state.x = Math.min(Math.max(state.x, 0), maxX);
    state.y = Math.min(Math.max(state.y, 0), maxY);
  };

  const applyPositions = () => {
    states.forEach((state) => {
      state.tile.style.left = `${state.x}px`;
      state.tile.style.top = `${state.y}px`;
    });
  };

  function computeStackTargets() {
    computeTargets();
    suppressScroll = true;
    requestAnimationFrame(() => {
      suppressScroll = false;
    });
  }

  const isMobileLayout = () =>
    window.matchMedia("(max-width: 600px)").matches;

  const resolveOverlaps = () => {
    for (let i = 0; i < states.length; i += 1) {
      const a = states[i];
      for (let j = i + 1; j < states.length; j += 1) {
        const b = states[j];
        const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
        const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
        if (!overlapX || !overlapY) {
          continue;
        }
        const push = a.y <= b.y ? b : a;
        const other = push === a ? b : a;
        push.y = other.y + other.height + 4;
        clampPosition(push);
      }
    }
  };

  const step = (time) => {
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    const mobileLayout = isMobileLayout();

    if (floatActive) {
      states.forEach((state) => {
        if (state.dragging) {
          return;
        }
        const dy = state.targetY - state.y;
        const stiffness = mobileLayout ? 3 : 6;
        const damping = Math.pow(mobileLayout ? 0.25 : 0.35, dt * 60);
        state.vy += dy * stiffness * dt;
        state.vy *= damping;
        state.y += state.vy * dt;
        if (Math.abs(dy) < 0.5 && Math.abs(state.vy) < 0.05) {
          state.y = state.targetY;
          state.vy = 0;
        }
      });
    }

    states.forEach((state) => {
      if (state.dragging) {
        return;
      }
      if (!floatActive) {
        state.x += state.vx * dt;
        state.y += state.vy * dt;
        const friction = Math.pow(0.92, dt * 60);
        state.vx *= friction;
        state.vy *= friction;
        if (Math.abs(state.vx) < 0.01) {
          state.vx = 0;
        }
        if (Math.abs(state.vy) < 0.01) {
          state.vy = 0;
        }
      }
      clampPosition(state);
    });

    if (mobileLayout && !floatActive) {
      resolveOverlaps();
    }

    applyPositions();
    requestAnimationFrame(step);
  };

  const startFloat = () => {
    states.forEach((state) => {
      state.startY = state.y;
    });
    states.forEach(updateTileHeight);
    computeStackTargets();
    floatActive = true;
  };

  const stopFloat = () => {
    floatActive = false;
    states.forEach((state) => {
      state.vx = 0;
      state.vy = 0;
    });
  };

  const scheduleFloat = () => {
    if (floatTimer) {
      clearTimeout(floatTimer);
    }
    floatTimer = setTimeout(() => {
      startFloat();
    }, 700);
  };

  window.addEventListener(
    "scroll",
    () => {
      if (suppressScroll) {
        return;
      }
      stopFloat();
      scheduleFloat();
    },
    { passive: true }
  );

  scheduleFloat();

  states.forEach((state) => {
    const { tile, content } = state;
    if (!content) {
      return;
    }
    content.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      stopFloat();
      state.dragging = true;
      state.tile.classList.add("is-dragging");
      state.dragOffsetX = event.clientX - state.x;
      state.dragOffsetY = event.clientY - state.y;
      state.lastMoveX = event.clientX;
      state.lastMoveY = event.clientY;
      state.lastMoveTime = performance.now();
      content.setPointerCapture(event.pointerId);
    });

    content.addEventListener("pointermove", (event) => {
      if (!state.dragging) {
        return;
      }
      const now = performance.now();
      const dt = Math.max((now - state.lastMoveTime) / 1000, 0.001);
      const dx = event.clientX - state.lastMoveX;
      const dy = event.clientY - state.lastMoveY;
      state.vx = dx / dt;
      state.vy = dy / dt;
      state.lastMoveX = event.clientX;
      state.lastMoveY = event.clientY;
      state.lastMoveTime = now;
      state.x = event.clientX - state.dragOffsetX;
      state.y = event.clientY - state.dragOffsetY;
      clampPosition(state);
      if (isMobileLayout()) {
        resolveOverlaps();
      }
      applyPositions();
    });

    const endDrag = (event) => {
      if (!state.dragging) {
        return;
      }
      state.dragging = false;
      state.tile.classList.remove("is-dragging");
      content.releasePointerCapture(event.pointerId);
      state.startY = state.y;
      if (floatActive) {
        computeStackTargets();
      }
      scheduleFloat();
    };

    content.addEventListener("pointerup", endDrag);
    content.addEventListener("pointercancel", endDrag);
  });

  requestAnimationFrame(step);
};

window.initPhysics = initPhysics;

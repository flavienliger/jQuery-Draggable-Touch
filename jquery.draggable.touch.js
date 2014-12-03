(function($){
	
	if(!$.events){
		//EVENTS
		$.events = {
			click: 'click',
			mousedown: 'mousedown',
			mouseup: 'mouseup',
			mousemove: 'mousemove'
		};
		$.touchEvents = {
			click: 'click',
			mousedown: 'touchstart',
			mouseup: 'touchend',
			mousemove: 'touchmove'
		};

		var tablet = navigator.userAgent.match(/(iPhone|iPod|iPad|Android)/i);
		if(tablet){
			$.events = $.extend($.events, $.touchEvents);
		}
	}
	
	var touch = $.events.mousedown == 'touchstart'? true: false;
	var dragEl = [];
	
	/**
	 * Set option of drag
	 * @param {Array} arg - argument for option
	 * @returns {Variant}
	 */
	var setOption = function(arg){

		var select;
		
		if(arg[0] === 'option'){

			if(typeof arg[1] === 'string'){
				select = arg[1];

				// set value
				if(arg[2] !== undefined){

					setActivate.apply(this, [select, arg[2]]);
					this.params[select] = arg[2];
				}

				// return single
				return this.params[select];
			}

			// set object value
			else if($.isPlainObject(arg[1])){
				$.extend(this.params, arg[1]);
			}

			// return all
			return this.params;
		}
		// { option }
		else if($.isPlainObject(arg[0])){

			setActivate.apply(this, [arg[0]]);
			$.extend(this.params, arg[0]);

			return this.params;
		}
		// methoddisable/ enable
		else {
			select = arg[0];
			
			if(select == 'disable')
				this.disable();
			if(select == 'enable')
				this.enable();
			if(select == 'destroy')
				this.destroy();
			if(select == 'widget' && this.moveObject)
				return this.moveObject;
		}
	};

	/**
	 * Set enable or disable
	 * @param {Array} arg - argument to check
	 * @param {Boolean} [val] - value of disable/enable
	 * @returns {Boolean}
	 */
	var setActivate = function(arg, val){

		var obj = $.isPlainObject(arg);
		var enable = -1, disable = -1;

		if(arg === 'enable' || (obj && arg.enable!==undefined)){
			enable = val!==undefined? val: obj? arg.enable: true;	
		}
		else if(arg === 'disable' || arg === 'disabled' || (obj && arg.disabled!==undefined)){
			disable = val!==undefined? val: obj? arg.disabled: true;
		}

		if(enable===-1 && disable===-1)
			return false;

		this.params.disabled = disable!==-1? disable: !enable;
		this.params.enable = enable!==-1? enable: !disable;

		return disable!==-1? disable: enable;
	};
	
	
	/* ---------------------------------------------- */
	/* --------------- DRAGGABLE -------------------- */
	
	/**
	 * Drag
	 * @param {jQuery} $o
	 * @param {Object} aParams
	 */
	var Drag = function($o, aParams){

		this.obj = $o;						// draggable object
		this.moveObject = undefined;		// movable object
		this.touchID = null;				// identifiant touch

		this.isDrag = false;				// is in move state
		this.isDraggable = true;			// block drag
		this.isStart = false;				// can move

		this.coord = {
			top: 0,
			left: 0,
			translateX: 0,
			translateY: 0,
			mouseX: 0,
			mouseY: 0
		};
		
		this.previous = {
			opacity : 1,
			zIndex: 'initial'
		};
		
		this.params = {
			// event
			start: function(){ return true; },
			drag: function(){ return true; },
			stop: function(){ return true; },

			// parameter
			addClasses: true,				// add class ui-draggable
			appendTo: 'parent',				// container to append parent() to default
			axis: false,					// contraint axis x/y/0
			containment: false,				// !not work
			cursor: 'auto',					// !not work
			cursorAt: false,				// start to top/ left
			delay: 0,						// !no twork
			disabled: false,				// disabled
			distance: 1,					// range before start
			grid: false,					// !not work
			helper: 'original',				// original/ helper/ fct
			opacity: false,					// opacity in dragging
			revert: false,					// bool/ valid/ invalid
			revertDuration: 500,			// duration revert
			snap: false,					// !not work
			snapMode: 'both',				// !not work
			snapTolerance: 20,				// !not work
			zIndex: false,					// zIndex drag el
			
			// annex
			enable: true,					// enable
			multitouch: false				// multitouch element
		};

		$.extend(this.params, aParams);
		this.create();
	};

	Drag.prototype = {

		/**
		 * Trigger event
		 * @param {String} type - name of event
		 * @param {Event} aEvent - event jQuery
		 * @param {Object} aData - special data
		 * @returns {Boolean}
		 */
		trigger: function(type, aEvent){
			var self = this;
			var event = aEvent||{};
			event.type = type;
			
			var data = {draggable: self.obj, helper: self.moveObject};

			this.obj.trigger(event, data);

			if(self.params[type] && typeof self.params[type] === 'function'){
				return self.params[type].apply(this.obj.get(0), [event, data])===false?false: true;
			}
			
			return true;
		},

		disable: function(){
			this.params.disabled = true;
			this.params.enable = false;
		},
		
		enable: function(){
			this.params.disabled = false;	
			this.params.enable = true;
		},
		
		/**
		 * Make draggable
		 * @param {Event} e - event for trigger
		 */
		create: function(e){
			var self = this;

			this.obj.data('draggable', this);
			if(self.params.addClasses)
				this.obj.addClass('ui-draggable');

			this.obj.bind($.events.mousedown, self.waitStart)
				.bind($.events.mousemove, self.waitDrag)
				.bind($.events.mouseup, self.stop);
			
			// trigger mouseup
			if(touch)
				this.obj.bind('mouseup', self.stop);

			this.trigger('create', e);
		},

		/**
		 * Return value of function or option
		 * @param {String} name - name of option
		 * @returns {String|Boolean}
		 */
		valueFct: function(name){
			if(typeof this.params[name] === 'function') {
			   return this.params[name]({}, { draggable: this.obj, helper: this.moveObject });
			}
			else{
				return this.params[name];	
			}
		},

		/**
		 * Check started draggable
		 * @returns {Boolean}
		 */
		isMultitouch: function(){

			if($('.ui-draggable-dragging').length > 0)
				return true;
			
			var el = getDraggableElement();
			for(var i=0, l=el.length; i<l; i++){
				if(el[i].isStart)
					return true;
			}
			
			return false;
		},

		stopTouch: function(){
			
			for(var i=0, l=dragEl.length; i<l; i++){
				$(dragEl[i]).trigger($.events.mouseup);
			}
		},
		
		/**
		 * Begin drag check if we can start
		 * @param {Event} e
		 */
		waitStart: function(e){

			e.preventDefault();
			
			var self = $(this).data('draggable');
			
			if(!self.params.multitouch && self.isMultitouch()){
				self.stopTouch();
				
				// fix bug mouseup not fired
				// rework for delete clone
				/*
				if($('.ui-draggable-dragging').length > 0){
					$('.ui-draggable-dragging').each(function(){
						if(this !== self.obj.get(0)){
							//$(this).remove();
						}
					});
				}
				*/
			}
			
			if(!self.isDraggable || !self.params.enable)
				return false;
			
			self.isStart = true; // first start

			// get identifier
			if(touch){
				var touches = e.originalEvent.targetTouches;
				self.touchID = touches[touches.length-1].identifier;
			}

			// set coord
			var coords = getCoordsDrag(document.body, e, self.touchID);
			self.coord.mouseX = coords.x;
			self.coord.mouseY = coords.y;
		},

		/**
		 * Set position for cursorAt option
		 */
		setCursorAt: function(){
			var self = this;
			
			if(!self.params.cursorAt)
				return false;
			
			if(self.params.cursorAt.top !== undefined || self.params.cursorAt.left !== undefined){

				var position = self.obj.position();
				var margin = {
					top: parseInt(self.obj.css('marginTop'), 10)||0,
					left: parseInt(self.obj.css('marginLeft'), 10)||0
				};
				
				var coords = {x: self.coord.parentX, y: self.coord.parentY};

				var cursorAt = {
					left: self.params.cursorAt.left*-1||0,
					top: self.params.cursorAt.top*-1||0
				};

				// coord - (pos + margin) + offset
				self.coord.translateX = coords.x-(position.left+margin.left)+cursorAt.left;
				self.coord.translateY = coords.y-(position.top+margin.top)+cursorAt.top;
				
				var transform = new Transform(self.obj)
					.translate(self.coord.translateX, self.coord.translateY)
					.getCssFormat();

				self.moveObject.css({
					WebkitTransform: transform
				});
			}
		},
		
		/**
		 * Make moveObject (helper)
		 */
		makeHelper: function(){
			var self = this;
			
			if(self.params.helper == 'clone'){
				self.moveObject = self.obj.clone(true);
				self.moveObject.removeAttr('id');
			}
			else if(typeof self.params.helper === 'function') {
				self.moveObject = $(self.params.helper.call(self.obj.get(0)));
			}
			else {
				self.moveObject = self.obj;		
			}
		},
		
		/**
		 * Start drag, set object
		 * @param {Event} e
		 */
		start: function(e){
			var self = this;

			/**
			 * Set position of moveObject
			 */
			var css = function(){
					
				self.moveObject.addClass('ui-draggable-dragging');

				if(self.params.opacity){
					self.previous.opacity = self.obj.css('opacity');
					self.moveObject.css('opacity', self.params.opacity);
				}

				if(self.params.zIndex){
					self.previous.zIndex = self.obj.css('z-index');
					self.moveObject.css('z-index', self.params.zIndex);
				}
				
				if(self.params.helper == 'clone' || typeof self.params.helper === 'function'){
					var position = self.obj.position();
					var margin = {
						top: parseInt(self.obj.css('marginTop'), 10)||0,
						left: parseInt(self.obj.css('marginLeft'), 10)||0
					};
					
					self.coord.top = position.top+margin.top;
					self.coord.left = position.left+margin.left;
					
					// appendTo params
					if(self.params.appendTo !== 'parent'){
						var actualParent = self.obj.parent().offset();
						var appendParent = $(self.params.appendTo).offset();
						var less = {
							top: appendParent.top-actualParent.top,
							left: appendParent.left-actualParent.left,
						};
						
						self.coord.top -= less.top;
						self.coord.left -= less.left;
					}
					
					self.moveObject.css({
						left: self.coord.left,
						top: self.coord.top,
						margin: 0
					});
				}

				self.moveObject.css({
					position: (self.obj.css('position')=='relative' && self.params.helper != 'clone')? 'relative': 'absolute'
				});
			};
			
			/**
			 * Block clic
			 */
			var block = function(){
				if(!self.params.multitouch && touch){
					$('<div>').addClass('drag-block').css({
						position: 'absolute',
						zIndex: 10000,
						width: '100%',
						height: '100%',
						top: 0,
						left: 0
					})
					.bind($.events.mousedown, function(){
						self.stopTouch();
					})
					.appendTo('body');
				}
			};
			
			// need before trigger start (for remove ID)
			self.makeHelper();
			
			if(!self.params.enable || !self.isDraggable || self.isDrag || !this.trigger('start', e))
				return false;
			
			block();
			
			$.extend(self.coord, {
				top: parseInt(self.obj.css('top'), 10)||0,
				left: parseInt(self.obj.css('left'), 10)||0,
				translateX: 0,
				translateY: 0,
				mouseX: 0,
				mouseY: 0
			});
			
			var hide = false;
			// show for get position
			if(self.obj.css('display') == 'none')
				hide = true;
			if(hide)
				self.obj.show();
			
			self.isDrag = true;
			self.obj.offset();
			
			//setTimeout(function(){
				css();
				self.setCursorAt();
				
				// hide for clone
				if(self.params.helper != 'original'){
					if(hide)
						self.obj.hide();
					
					self.moveObject.show().appendTo(self.params.appendTo!='parent'? self.params.appendTo: self.obj.parent());
				}
				
				dropManage.update.apply(this, [e]);
			//}, 50);
		},

		/**
		 * Wait distance before drag
		 * @param {Event} e
		 */
		waitDrag: function(e){

			e.stopPropagation();
			e.preventDefault();
			
			var self = $(this).data('draggable');
			
			if(!self.isStart || !self.params.enable)
				return false;
			
			if(self.isDrag)
				return self.drag(e);
			
			var coords = getCoordsDrag($(this).parent().get(0), e, self.touchID);
			
			// temp for cursorAt
			self.coord.parentX = coords.x;
			self.coord.parentY = coords.y;
			
			coords = getCoordsDrag(document.body, e, self.touchID);
			
			if(Math.abs((self.coord.mouseX+self.coord.mouseY) - (coords.x+coords.y)) > self.params.distance){
				self.start(e);
				
				self.coord.mouseX = coords.x;
				self.coord.mouseY = coords.y;
			}
		},

		/**
		 * Move object
		 * @param {Event} e
		 */
		drag: function(e){ 
			
			var self = this;

			if(!self.isDraggable || !self.isDrag)
				return false;

			var coords = getCoordsDrag(document.body, e, self.touchID);

			self.params.drag.apply(self.obj.get(0), [e]);

			var move = {
				x: self.params.axis == 'y'? 0: (coords.x - self.coord.mouseX),
				y: self.params.axis == 'x'? 0: (coords.y - self.coord.mouseY)
			};

			var translate = {
				x: self.coord.translateX + move.x,
				y: self.coord.translateY + move.y
			};

			$.extend(self.coord, {
				translateX: translate.x,
				translateY: translate.y,
				mouseX: coords.x,
				mouseY: coords.y,
				event: e
			});

			self.moveObject.css({
				WebkitTransform: new Transform(self.moveObject).translate(move.x, move.y).getCssFormat()
			});

			dropManage.hover.apply(this, [e, coords]);
		},

		/**
		 * Stop drag
		 * @param {Event} e
		 */
		stop: function(e){
			
			e.stopPropagation();
			e.preventDefault();
			
			var self = $(this).data('draggable');
			
			if(!self.isDrag || !self.isDraggable || !self.isStart){
				self.isStart = false;
				return false;
			}
			
			self.obj.removeClass('ui-draggable-dragging');
			self.coord.top += self.coord.translateY;
			self.coord.left += self.coord.translateX;

			self.moveObject.css({
				left: self.coord.left,
				top: self.coord.top,
				WebkitTransform: new Transform(self.moveObject)
					.translate(-self.coord.translateX, -self.coord.translateY)
					.getCssFormat()
			});
			
			var dropped = dropManage.check.apply(self, [self.coord.event, 
								{x: self.coord.mouseX, y: self.coord.mouseY}]);
			var revert = self.valueFct('revert');

			if(String(revert) == 'true' || (revert == 'invalid' && !dropped) || (revert == 'valid' && dropped)){ 
				self.revert(self.coord.event);	
			}
			// not revert
			else {
				self.deleteClone();
				self.trigger('stop', self.coord.event);
				
				self.isDraggable = false;
				setTimeout(function(){
					self.isDraggable = true;
					self.moveObject = undefined;
				}, 50);
			}
			
			self.isStart = false;
			self.isDrag = false;
		},

		/**
		 * Remove clone
		 */
		deleteClone: function(){
			if(this.params.helper != 'original'){
				this.moveObject.remove();
			}
			// reset original
			else{
				if(this.params.opacity)
					this.obj.css('opacity', this.previous.opacity);
				if(this.params.zIndex)
					this.obj.css('z-index', this.previous.zIndex);
			}
			
			$('.drag-block').remove();
			dropManage.unHover.apply(this, []);
		},

		/**
		 * Revert position of object
		 * @param {Event} e
		 */
		revert: function(e){
			var self = this;

			this.isDraggable = false;
			
			// revert uniform
			//var dist = pytha({x: 0, y: 0}, {x: this.coord.translateX, y: this.coord.translateY});
			//var time = dist*0.002;
			var time = self.params.revertDuration/1000;
			
			this.moveObject.css({
				WebkitTransition: '-webkit-transform '+time+'s ease-out',
				WebkitTransform: new Transform(self.moveObject)
					.translate(-self.coord.translateX, -self.coord.translateY)
					.getCssFormat()
			});
			
			setTimeout(function(){
				self.coord.top -= self.coord.translateY;
				self.coord.left -= self.coord.translateX;

				self.moveObject.css({
					WebkitTransition: ''
				});
				
				setTimeout(function(){
					self.moveObject.css({
						left: self.coord.left,
						top: self.coord.top,
						WebkitTransform: new Transform(self.moveObject)
							.translate(self.coord.translateX, self.coord.translateY)
							.getCssFormat()
					});
					
					self.deleteClone();
					self.isDraggable = true;
					self.moveObject = undefined;
					self.trigger('stop', e);
				}, 50);
			}, self.params.revertDuration);
		},

		/**
		 * Destroy event
		 */
		destroy: function(){

			var self = this;

			this.obj.unbind($.events.mousedown, self.waitStart)
				.unbind($.events.mousemove, self.waitDrag)
				.unbind($.events.mouseup, self.stop);

			this.obj.removeClass('ui-draggable');
			this.trigger('destroy');
		},

		/**
		 * Obtains position in drag
		 * @returns {Object.<top, left>}
		 */
		getDragPos: function(){
			if(this.isDrag)
				return {
					left: this.coord.translateX+this.coord.left,
					top: this.coord.translateY+this.coord.top
				};
			else
				return {
					left: parseInt(this.moveObject.css('left')),
					top: parseInt(this.moveObject.css('top'))
				};
		}
	};
	
	/**
	 * Extend jQuery draggable
	 * @returns {jQuery|variant} return option or chain jQuery
	 */
	$.fn.draggable = function(aParams){

		var params = arguments;
		var first = aParams||{};
		var data = [];
		var push = false;
		
		this.each(function(){

			if($(this).data('draggable')){
				if(aParams == 'destroy'){
					$(this).data('draggable').destroy();
					$(this).removeData('draggable');
					// remove element in array
					for(var i=0, l=dragEl.length; i<l; i++){
						if(dragEl[i] == this){
							dragEl.splice(i, 1);
						}
					}
				}
				else{
					var opt = setOption.apply($(this).data('draggable'), [params])
					
					if(opt)
						data.push(opt);
				}
			}
			else if(typeof params[0] == 'object'){
				dragEl.push(this);
				new Drag($(this), first);
			}
		});

		if(data.length>0){
			if(data.length == 1)
				return data[0];
			return data;
		}
		return this;
	};

	/**
	 * Get draggable element - for multitouch
	 * @returns {Array}
	 */
	var getDraggableElement = function(){
		var el = [];
		var temp;
		
		for(var i=0, l=dragEl.length; i<l; i++){
			temp = $(dragEl[i]).data('draggable');
			
			if(temp)
				el.push(temp);
		}
		return el;
	};
	
	/**
	 * Call private function and return position
	 * @returns {Object.<top, left>}
	 */
	$.fn.getDragPos = function(){
		var self = $(this).data('draggable');
		if(self){
			return self.getDragPos();
		}
		return false;
	};
	
	
	/* ---------------------------------------------- */
	/* --------------- DROPPABLE -------------------- */
	
	/**
	 * Drop
	 * @param {jQuery} $o
	 * @param {Object} aParams
	 */
	var Drop = function($o, aParams){

		this.obj = $o;
		
		this.coord = {
			topLeft: 0,
			bottomRight: 0
		};

		this.params = {
			// event
			drop: function(){},	
			out: function(){},

			// parameter
			activeClass: '',				// start with drag
			hoverClass: '',					// addClass when hover
			accept: '',						// condition to accept -notwork
			disabled: false,				// disabled
			enable: true					// enable
		};

		$.extend(this.params, aParams);
		this.create();
	};

	Drop.prototype = {

		/**
		 * Update position topLeft and bottomRight
		 */
		update: function(){
			var position = this.obj.offset();
			var size = { w: this.obj.width(), h: this.obj.height() };

			this.coord = {
				topLeft: { x: position.left, y: position.top },
				bottomRight: { x: position.left+size.w, y: position.top+size.h }						  
			};
		},

		/**
		 * Trigger event
		 * @param {String} type - name of event
		 * @param {Event} aEvent - event jQuery
		 * @param {Object} aData - special data
		 * @returns {Boolean}
		 */
		trigger: function(type, aEvent, aData){
			var self = this;
			var event = aEvent||{};
			event.type = type;

			var data = aData||{};

			this.obj.trigger(event, data);
			
			if(self.params[type] && typeof self.params[type] === 'function'){
				return self.params[type].apply(this.obj.get(0), [event, data])===false?false: true;	
			}
		},

		create: function(){
			this.obj.data('droppable', this);
			this.obj.addClass('ui-droppable');	
		},
		
		/**
		 * Trigger hover
		 * @param {jQuery} el - element hover notUse
		 */
		hover: function(el){
			
			this.obj.addClass(this.params.hoverClass);
			this.trigger('hover');
		},
		
		/**
		 * Trigger hover
		 * @param {Event} e
		 * @param {jQuery} el - element drag
		 * @returns {Boolean}
		 */
		dropped: function(e, drag){
			this.out();
			
			return this.trigger('drop', e, {
				draggable: drag.obj,
				helper: drag.moveObject
				//position: drag.moveObject.position(),
				//offset: drag.moveObject.offset()
			});
		},
		
		/**
		 * Trigger un hover
		 * @param {jQuery} el - element unhover notUse
		 */
		out: function(el){

			this.obj.removeClass(this.params.hoverClass);
			this.trigger('out');
		},
		
		/**
		 * Destroy event
		 */
		destroy: function(){

			var self = this;
			
			this.obj.removeClass('ui-droppable');
			this.trigger('destroy');
		},
	};

	/**
	 * Extend jQuery droppable
	 * @returns {jQuery} chain jQuery
	 */	
	$.fn.droppable = function(aParams){
		
		var params = arguments;
		var first = aParams||{};
		var data = [];

		var isOption = arguments[0] == 'option' || arguments[0] == 'disable' || arguments[0] == 'enable';

		this.each(function(){

			if($(this).data('droppable')){
				if(aParams == 'destroy'){
					$(this).data('droppable').destroy();
					$(this).removeData('droppable');
				}
				else{
					data.push(setOption.apply($(this).data('droppable'), [params]));
				}
			}
			else if(!isOption){
				new Drop($(this), first);
			}
		});

		if(data.length>0 && arguments.length == 2)
			return data;

		return this;
	};

	
	var dropManage = {
		/**
		 * Check if a element has hover or unhover params
		 * @returns {Boolean}
		 */
		hasHover: function(){

			var droppableElement = getDroppableElement();
			var l = droppableElement.length;
			if(l<=0) return false;

			for(var i=0; i<l; i++){
				if(droppableElement[i].params.hoverClass || droppableElement[i].params.out)
					return true;
			}
			return false;
		},

		/**
		 * Unhover drop element
		 */
		unHover: function(){

			var droppableElement = getDroppableElement();
			var l = droppableElement.length;
			if(l<=0) return false;

			for(var i=0; i<l; i++){
				droppableElement[i].out();
			}
		},

		/**
		 * Update coord of drop element
		 */
		update: function(){

			var droppableElement = getDroppableElement();
			var l = droppableElement.length;
			if(l<=0) return false;

			for(var i=0; i<l; i++){
				droppableElement[i].update();
			}
		},

		hoverDrop: [],

		/**
		 * Hover drop element
		 * @param {Event} e
		 * @param {Object.<x, y>} mouse
		 */
		hover: function(e, mouse){

			var droppableElement = getDroppableElement();
			var l = droppableElement.length;
			if(l<=0 || !dropManage.hasHover()) return false;

			for(var i=0; i<l; i++){
				// has hover class or unhover function
				if(droppableElement[i].params.hoverClass || droppableElement[i].params.out){ 
					// colision aabb
					if(mouse.x > droppableElement[i].coord.topLeft.x && 
						mouse.x < droppableElement[i].coord.bottomRight.x &&
						mouse.y > droppableElement[i].coord.topLeft.y && 
						mouse.y < droppableElement[i].coord.bottomRight.y)
					{
						if($.inArray(i, dropManage.hoverDrop)==-1){
							dropManage.hoverDrop.push(i);
							droppableElement[i].hover(this.moveObject.get(0));
						}
					}
					else{
						if($.inArray(i, dropManage.hoverDrop)!=-1){
							dropManage.hoverDrop.splice($.inArray(i, dropManage.hoverDrop), 1);
							droppableElement[i].out(this.moveObject.get(0));
						}
					}
				}
			}
		},

		/**
		 * Check is dropped
		 * @param {Event} e
		 * @param {Object.<x, y>} mouse
		 * @returns {Boolean}
		 */
		check: function(e, mouse){

			var droppableElement = getDroppableElement();
			var l = droppableElement.length;
			if(l<=0) return false;
			
			for(var i=0; i<l; i++){
				droppableElement[i].update();

				if(mouse.x > droppableElement[i].coord.topLeft.x && 
					mouse.x < droppableElement[i].coord.bottomRight.x &&
					mouse.y > droppableElement[i].coord.topLeft.y && 
					mouse.y < droppableElement[i].coord.bottomRight.y)
				{
					return droppableElement[i].dropped(e, this);
				}
			}
			return false;
		}
	};

	/**
	 * Get droppable element
	 * @returns {Array}
	 */
	var getDroppableElement = function(){
		var el = [];
		var temp;
		
		$('.ui-droppable').each(function(){
			temp = $(this).data('droppable');
			
			if(temp && temp.params.enable)
				el.push(temp);
		});
		return el;
	};
	
	
	/* ---------------------------------------------- */
	/* ----------------- UTILS ---------------------- */
		
	/**
	 * Obtain coords exactly
	 * @param {Object} el - element html
	 * @param {Event} event
	 * @return {Object.<x, y>} coord
	 */
	var getCoordsDrag = function(el, event, touchID) {
		
		var ox = 0, oy = 0;
		
		ox = el.scrollLeft - el.offsetLeft;
		oy = el.scrollTop - el.offsetTop;
		
		while(el=el.offsetParent){
			ox += el.scrollLeft - el.offsetLeft;
			oy += el.scrollTop - el.offsetTop;
		}
			
		// mouse or touch coord
		var coord = dragPointerEventToXY(event, touchID);

		return {
			x: coord.x + ox,
			y: coord.y + oy
		};
	};
	
	/**
	 * Coord touch/mouse
	 * @param {Event} event
	 * @return {Object.<x, y>} coord
	 */
	var dragPointerEventToXY = function(e, touchID){
		
		var out = {x:0, y:0};
		
		// if touch event
		if(touch){
			var touches = e.originalEvent.targetTouches;
			var id = 0;
			
			for(var i=0, l=touches.length; i<l; i++){
				if(touches[i].identifier == touchID){
					id = i;
					break;	
				}
			}
			
			var actual = touches[id];
			out.x = actual.pageX;
			out.y = actual.pageY;
		} 
		// if mouse event
		else {
			out.x = e.pageX;
			out.y = e.pageY;
		}
		
		return out;
	};
	
})(jQuery);
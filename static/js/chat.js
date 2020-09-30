var publishKey = 'pub-c-38f7ad82-2ecc-4b71-96f0-7392a183b5dc';
var subscribeKey = 'sub-c-29125372-d740-11ea-b3f2-c27cb65b13f4';
        
var currScrollHeight = 0;
var MESSAGE_TEXT_HEIGHT = 27;

var nickname = null;
var userId = null;

var currentUser;
var currChannelUrl = null;
var currChannelInfo = null;
var ChannelList = new Map();
var channelMessageList = {};

var pubnub;

/***********************************************
 *            PubNub Settings (App Load)
 **********************************************/
function init() {
  userId = decodeURI(decodeURIComponent(getUrlVars()['userid']));
  userId = checkUserId(userId);
  nickname = decodeURI(decodeURIComponent(getUrlVars()['nickname']));

  $('.init-check').show();
  startPubNub(userId, nickname);
  $('.left-nav-user-nickname').html(xssEscape(nickname));
}

$(document).ready(function () {
  notifyMe();
  init();
});

function startPubNub(userId, nickName) {
	console.log('Start PubNub');
	pubnub = new PubNub({
        publishKey: publishKey,
        subscribeKey: subscribeKey,
        uuid: userId,
    });
    
    //add listeners
    pubnub.addListener({
        message: function(m){
			setChatMessage(m);
			hideTyping();
        },
        signal: function(s){
    		if (currChannelUrl == s.channel) {
      			showTyping(s);
    		}
        }
    });
    
    //data setup
    //isInit = true;
    $('.init-check').hide();
    createUser(userId);
    getChannelList(true);
}

function createUser(userId) {
	pubnub.objects.getUUIDMetadata({
        uuid: userId
    },function(status,response){
		if(response == undefined || status == 404) {
        console.log('user not found');
    	var data = {
        	name: nickname,
        	profileUrl: 'http://pubnub.com/user/' + nickname,
        	email: 'test@test.com'
    	}
		pubnub.objects.setUUIDMetadata({uuid: userId,data},function(status, response){
    		if(response == undefined || response.status != 200) {
            	console.log('create user failed');
            	return;
        	} else{
        		//console.log('here');
        		currentUser = {
                	userId: response.data.id,
                	nickname: response.data.name,
                	profile: response.data.profileUrl,
                	email: response.data.email
            	}
            	
            	console.log(currentUser);	
        	}
    	});
    	}
    	else{
    		currentUser = {
                	userId: response.data.id,
                	nickname: response.data.name,
                	profile: response.data.profileUrl,
                	email: response.data.email
            	}
            	
            //console.log(currentUser);
    	}
    });
}
/***********************************************
 *          // END PubNub Settings
 **********************************************/

/***********************************************
 *                OPEN CHAT
 **********************************************/
$('#btn_open_chat').click(function () {
  popupInit();
  $('.modal-guide-create').hide();
  $('.left-nav-button-guide').hide();
  $('.modal-messaging').hide();
  $('#btn_messaging_chat').removeClass('left-nav-messaging--active');

  if ($(this).hasClass('left-nav-open--active')) {
    $('.right-section__modal-bg').hide();
    $(this).removeClass('left-nav-open--active');
    $('.modal-open-chat').hide();
  } else {
    $('.right-section__modal-bg').show();
    $(this).addClass('left-nav-open--active');
    getChannelList(false);
  }
});

function getChannelList(isLoad) {
 if(isLoad){
	pubnub.objects.getAllChannelMetadata().then(function(response){
		if(response == undefined || response.status != 200) {
			console.log('channels not found');
			return;
    	} else{
        	//OpenChannelListQuery = '';
      		//channelMemberList = '';
      		var cannnela = null
      		
        	for(i in response.data){
        		 channel = {
        			url: response.data[i].id,
        			lastMessage: 'hi',
        			name: response.data[i].name,
      			}
      			//addGroupChannel(false, channelMemberList, cannnela);
      			
      			ChannelList.set(channel.url,channel);
      			
      			var item = '<div class="modal-open-chat-list__item" onclick="joinChannel(\'%channelUrl%\',true)">%channelName%</div>';
    			item = item.replace(/%channelUrl%/, response.data[i].id).replace(/%channelName%/, xssEscape(response.data[i].name));
    			$('.modal-open-chat-list').append(item);
        	}
        	if(!isLoad){
        		$('.modal-open-chat').show();
        	}
    	}	
    });
 }
 else{
 	$('.modal-open-chat').show();
 }
}

function joinChannel(channelUrl, flag) {
//console.log('Joining channel: '+ channelUrl);
	if (channelUrl == currChannelUrl) {
    	navInit();
    	popupInit();
    	return false;
  	}

    $('.chat-top__button-hide').hide();
    currChannelInfo = ChannelList.get(channelUrl);
    currChannelUrl = channelUrl;

    $('.chat-empty').hide();
    initChatTitle(xssEscape(currChannelInfo.name), 0);

    $('.chat-canvas').html('');
    $('.chat-input-text__field').val('');
    $('.chat').show();

    navInit();
    popupInit();

    //isOpenChat = true;
    //loadMoreChatMessage(scrollPositionBottom);
    setWelcomeMessage(xssEscape(currChannelInfo.name));
    addChannel();
    $('.chat-input-text__field').attr('disabled', false);
      
    if(flag == true){      
      pubnub.subscribe({
        channels: [channelUrl],
        withPresence: true
      },function(status, response){});  
  }
}

function addChannel() {
  if ($('.left-nav-channel-open').length == 0) {
    $('.left-nav-channel-empty').hide();
  }

  $.each($('.left-nav-channel'), function (index, channel) {
    $(channel).removeClass('left-nav-channel-open--active');
    $(channel).removeClass('left-nav-channel-messaging--active');
    $(channel).removeClass('left-nav-channel-group--active');
  });

  var addFlag = true;
  $.each($('.left-nav-channel-open'), function (index, channel) {
    if (currChannelUrl == $(channel).data('channel-url')) {
      $(channel).addClass('left-nav-channel-open--active');
      addFlag = false;
    }
  });

  if (addFlag) {
    $('#open_channel_list').append(
      '<div class="left-nav-channel left-nav-channel-open left-nav-channel-open--active" ' +
      '     onclick="joinChannel(\'' + currChannelInfo.url + '\',false)"' +
      '     data-channel-url="' + currChannelInfo.url + '"' +
      '>' +
      (currChannelInfo.name.length > 12 ? xssEscape(currChannelInfo.name.substring(0, 12)) + '...' : xssEscape(currChannelInfo["name"])) +
      '</div>'
    );
  }

  $('.modal-guide-create').hide();
  $('.left-nav-button-guide').hide();
}
/***********************************************
 *              // END OPEN CHAT
 **********************************************/

/***********************************************
 *              Messaging Function
 **********************************************/
function setChatMessage(m) {
  var message = {
                messageId: m.timetoken,
                sender: {
                	userId: m.publisher,
                	nickname: m.message.nickname,
                },
                message: m.message.text,
            }
  $('.chat-canvas').append(messageList(message));

  updateChannelMessageCache(currChannelInfo, message);
  scrollPositionBottom();
}

var scrollPositionBottom = function () {
  var scrollHeight = $('.chat-canvas')[0].scrollHeight;
  $('.chat-canvas')[0].scrollTop = scrollHeight;
  currScrollHeight = scrollHeight;
};

//var PreviousMessageListQuery = null;

function messageList(message) {
  var msgList = '';
  var user = message.sender;
  var channel = currChannelInfo;
    if (isCurrentUser(user.userId)) {
      var msg = '' +
        '<div class="chat-canvas__list">' +
        '  <label class="chat-canvas__list-name chat-canvas__list-name__user" data-userid="%userid%">' +
        xssEscape(user.nickname) +
        '  </label>' +
        '  <label class="chat-canvas__list-separator">:</label>' +
        '  <label class="chat-canvas__list-text" data-messageid="%messageid%">%message%</label>' +
        '</div>';
      msg = msg.replace('%message%', convertLinkMessage(xssEscape(message.message)));
      msg = msg.replace('%userid%', user.userId).replace('%messageid%', message.messageId);

      msgList += msg;
    } else {
      var msg = '' +
        '<div class="chat-canvas__list">' +
        '  <label class="chat-canvas__list-name" data-userid="%userid%" data-nickname="%nickname%">' +
        xssEscape(user.nickname) +
        '  </label>' +
        '  <label class="chat-canvas__list-separator">:</label>' +
        '  <label class="chat-canvas__list-text" data-messageid="%messageid%">' +
        convertLinkMessage(xssEscape(message.message)) +
        '  </label>' +
        '</div>';
      msgList += msg.replace('%userid%', user.userId).replace('%nickname%', xssEscape(user.nickname)).replace('%messageid%', message.messageId);
    }
  //}

  return msgList;
}

function updateChannelMessageCache(channel, message) {
  var readReceipt = -1;
  if (!channelMessageList.hasOwnProperty(channel.url)) {
    channelMessageList[channel.url] = {};
  }

  if (!channelMessageList[channel.url].hasOwnProperty(message.messageId)) {
    channelMessageList[channel.url][message.messageId] = {};
  }

  channelMessageList[channel.url][message.messageId]['message'] = message;

    channelMessageList[channel.url][message.messageId]['readReceipt'] = readReceipt;

    var elemString = '.chat-canvas__list-text[data-messageid=' + message.messageId + ']';
    var elem = $(elemString).next();
    if (readReceipt == 0) {
      elem.html('').hide();
    } else {
      elem.html(readReceipt);
      if (!elem.is(':visible')) {
        elem.show();
      }
    }
}

function updateChannelMessageCacheAll(channel) {
  for (var i in channelMessageList[channel.url]) {
    var message = channelMessageList[channel.url][i]['message'];
    updateChannelMessageCache(channel, message);
  }
}

function setWelcomeMessage(name) {
  $('.chat-canvas').append(
    '<div class="chat-canvas__list-notice">' +
    '  <label class="chat-canvas__list-system">' +
    'Welcome to {}!'.format(name) +
    '  </label>' +
    '</div>'
  );
}

$('.chat-input-text__field').keydown(function (event) {
  if (event.keyCode == 13 && !event.shiftKey) {
    event.preventDefault();
    if (!$.trim(this.value).isEmpty()) {
      event.preventDefault();
      this.value = $.trim(this.value);
	  var publishConfig = {
            channel: currChannelInfo.url,
            message: {
                text: $.trim(this.value),
                nickname: nickname
            }
        }
      pubnub.publish(publishConfig);

      scrollPositionBottom();
    }
    this.value = "";
  } else {
    if (!$.trim(this.value).isEmpty()) {
      if (!currChannelInfo.open) {
      	var config = {
            channel: currChannelInfo.url,
            message: {
                typing: 'on'
            }
        }
      	pubnub.signal(config, function(status, response){
      	});
      }
    } else{
    	hideTyping();
    }
  }
});

function showTyping(s) {
	var typingEvent = {
				state: s.message.typing,
				userId: s.publisher
			}
			
  	if (typingEvent.state == 'off') {
    	$('.chat-input-typing').hide();
    	$('.chat-input-typing').html('');
    	return;
  	}
  	var nickname = typingEvent.userId;
	$('.chat-input-typing').html(nickname+' is typing...');
    $('.chat-input-typing').show();
};

function hideTyping() {
	$('.chat-input-typing').hide();
    $('.chat-input-typing').html('');
    return;
}
/***********************************************
 *          // END Messaging Function
 **********************************************/
 $('#guide_create').click(function () {
  $('.modal-guide-create').hide();
});

function initChatTitle(title, index) {
  $('.chat-top__title').html(title);
  $('.chat-top__title').show();
  $('.chat-top-button').show();
  $('.chat-top__button-invite').hide();
  $('.chat-top__title').removeClass('chat-top__title--messaging');
  $('.chat-top__title').removeClass('chat-top__title--group');
  if (index == -1) {
    $('.chat-top__title').hide();
    $('.chat-top-button').hide();
  } else if (index == 0) {
    $('.chat-top__button-member').removeClass('chat-top__button-member__all');
    $('.chat-top__button-member').addClass('chat-top__button-member__right');
  } else {
    if (index == 1) {
      $('.chat-top__title').addClass('chat-top__title--messaging');
    } else {
      $('.chat-top__title').addClass('chat-top__title--group');
    }
    $('.chat-top__button-member').removeClass('chat-top__button-member__right');
    $('.chat-top__button-member').addClass('chat-top__button-member__all');
    $('.chat-top__button-invite').show();
  }
}

$('.right-section__modal-bg').click(function () {
  navInit();
  popupInit();
});

function navInit() {
  $('.right-section__modal-bg').hide();

  // OPEN CHAT
  $('#btn_open_chat').removeClass('left-nav-open--active');
  $('.modal-open-chat').hide();

  // MESSAGING
  $('#btn_messaging_chat').removeClass('left-nav-messaging--active');
  $('.modal-messaging').hide();
}

function popupInit() {
  $('.modal-member').hide();
  $('.chat-top__button-member').removeClass('chat-top__button-member--active');
  $('.modal-invite').hide();
  $('.chat-top__button-invite').removeClass('chat-top__button-invite--active');
}

window.onfocus = function () {
  $.each($('.left-nav-channel'), function (index, item) {
    if ($(item).data("channel-url") == currChannelUrl) {
      $(item).find('div[class="left-nav-channel__unread"]').remove();
    }
  });
};
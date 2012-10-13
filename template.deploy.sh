IP=""
PRJ_DIR="/home/foronetwotrip/412trip"

SSH_RUN="cd $PRJ_DIR && npm install && sudo /etc/init.d/nginx restart && \
sudo sv restart 412redis && sudo sv restart 412node && make test"

rsync -avz --delete --exclude-from=rsync_exclude.txt \
  -e ssh . foronetwotrip@$IP:$PRJ_DIR > tmp/rsync.log && \
ssh foronetwotrip@$IP "$SSH_RUN" && \
echo && \
echo 'Done!'